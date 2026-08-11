import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { vi } from 'vitest';

import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let auth: AuthService;
  let router: Router;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([])
      ]
    }).compileComponents();
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  function seedSession(access = 'token-viejo', refresh = 'refresh-viejo'): void {
    auth.token.set(access);
    auth.refreshToken.set(refresh);
  }

  function expect401(promise: Promise<unknown>): Promise<void> {
    return promise.then(
      () => {
        throw new Error('Se esperaba un error 401');
      },
      (err: { status?: number }) => {
        expect(err.status).toBe(401);
      }
    );
  }

  it('adds the Bearer token to outgoing requests', async () => {
    seedSession();
    const promise = firstValueFrom(http.get('/api/products'));
    const req = httpMock.expectOne('/api/products');
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-viejo');
    req.flush({ data: [] });

    await promise;
  });

  it('refreshes the token on a 401 and retries the original request', async () => {
    seedSession();
    const promise = firstValueFrom(http.get('/api/products'));
    httpMock
      .expectOne('/api/products')
      .flush({ message: 'expirado' }, { status: 401, statusText: 'Unauthorized' });

    const refreshReq = httpMock.expectOne(`${environment.apiUrl}/api/auth/refresh`);
    expect(refreshReq.request.method).toBe('POST');
    expect(refreshReq.request.body).toEqual({ refreshToken: 'refresh-viejo' });
    refreshReq.flush({ accessToken: 'token-nuevo', refreshToken: 'refresh-nuevo' });

    const retry = httpMock.expectOne('/api/products');
    expect(retry.request.headers.get('Authorization')).toBe('Bearer token-nuevo');
    retry.flush({ data: [1] });

    await expect(promise).resolves.toEqual({ data: [1] });
    expect(auth.token()).toBe('token-nuevo');
    expect(auth.refreshToken()).toBe('refresh-nuevo');
  });

  it('does not refresh on 401s from auth endpoints (p. ej. login)', async () => {
    seedSession();
    const promise = firstValueFrom(
      http.post(`${environment.apiUrl}/api/auth/login`, { email: 'a@b.c', password: 'incorrecta' })
    );
    httpMock
      .expectOne(`${environment.apiUrl}/api/auth/login`)
      .flush({ message: 'Credenciales inválidas' }, { status: 401, statusText: 'Unauthorized' });

    await expect401(promise);
    httpMock.expectNone(`${environment.apiUrl}/api/auth/refresh`);
    // La sesión sigue viva: el 401 del login no la destruye.
    expect(auth.isAuthenticated()).toBe(true);
  });

  it('logs out and redirects to /auth when the refresh fails', async () => {
    seedSession();
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const promise = firstValueFrom(http.get('/api/products'));
    httpMock
      .expectOne('/api/products')
      .flush({ message: 'expirado' }, { status: 401, statusText: 'Unauthorized' });

    httpMock
      .expectOne(`${environment.apiUrl}/api/auth/refresh`)
      .flush({ message: 'refresh inválido' }, { status: 401, statusText: 'Unauthorized' });

    await expect401(promise);
    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.token()).toBeNull();
    expect(auth.refreshToken()).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/auth'], expect.objectContaining({ queryParams: { returnUrl: '/' } }));
  });

  it('logs out when the refresh succeeds but returns no token', async () => {
    // Sesión sin access token (pero con refresh): el refresh responde 200 vacío.
    seedSession('', 'refresh-viejo');
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const promise = firstValueFrom(http.get('/api/products'));
    httpMock.expectOne('/api/products').flush({}, { status: 401, statusText: 'Unauthorized' });

    httpMock.expectOne(`${environment.apiUrl}/api/auth/refresh`).flush({});

    await expect401(promise);
    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.refreshToken()).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/auth'], expect.objectContaining({ queryParams: { returnUrl: '/' } }));
  });

  it('does not retry twice nor refresh again when the retried request still fails with 401', async () => {
    seedSession();
    const promise = firstValueFrom(http.get('/api/products'));
    httpMock
      .expectOne('/api/products')
      .flush({ message: 'expirado' }, { status: 401, statusText: 'Unauthorized' });
    httpMock
      .expectOne(`${environment.apiUrl}/api/auth/refresh`)
      .flush({ accessToken: 'token-nuevo', refreshToken: 'refresh-nuevo' });

    const retry = httpMock.expectOne('/api/products');
    expect(retry.request.headers.get('Authorization')).toBe('Bearer token-nuevo');
    retry.flush({ message: 'denegado' }, { status: 401, statusText: 'Unauthorized' });

    await expect401(promise);
    // Un solo refresh en total: el reintento fallido no dispara otro.
    httpMock.expectNone(`${environment.apiUrl}/api/auth/refresh`);
  });

  it('shares a single refresh between concurrent 401s', async () => {
    seedSession();
    const p1 = firstValueFrom(http.get('/api/products'));
    const p2 = firstValueFrom(http.get('/api/categories'));
    httpMock.expectOne('/api/products').flush({}, { status: 401, statusText: 'Unauthorized' });
    httpMock.expectOne('/api/categories').flush({}, { status: 401, statusText: 'Unauthorized' });

    httpMock
      .expectOne(`${environment.apiUrl}/api/auth/refresh`)
      .flush({ accessToken: 'token-nuevo', refreshToken: 'refresh-nuevo' });

    const retry1 = httpMock.expectOne('/api/products');
    const retry2 = httpMock.expectOne('/api/categories');
    expect(retry1.request.headers.get('Authorization')).toBe('Bearer token-nuevo');
    expect(retry2.request.headers.get('Authorization')).toBe('Bearer token-nuevo');
    retry1.flush({ data: [] });
    retry2.flush({ data: [] });

    await Promise.all([p1, p2]);
    expect(auth.token()).toBe('token-nuevo');
  });
});
