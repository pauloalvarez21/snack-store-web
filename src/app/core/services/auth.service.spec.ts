import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('logs in, stores the token and the user profile', async () => {
    const promise = firstValueFrom(service.login({ email: 'cliente@snack.store', password: 'Demo123!' }));
    const req = httpMock.expectOne(`${environment.apiUrl}/api/auth/login`);
    expect(req.request.method).toBe('POST');
    req.flush({
      access_token: 'token-fake',
      user: {
        id: 'u1',
        email: 'cliente@snack.store',
        firstName: 'Cliente',
        lastName: 'Demo',
        role: 'CUSTOMER'
      }
    });

    await promise;
    expect(service.isAuthenticated()).toBe(true);
    expect(service.token()).toBe('token-fake');
    expect(service.user()?.firstName).toBe('Cliente');
    expect(service.user()?.role).toBe('CUSTOMER');
    expect(localStorage.getItem('snack_store_token')).toBe('token-fake');
  });

  it('rejects invalid credentials and keeps the session closed', async () => {
    const promise = firstValueFrom(service.login({ email: 'cliente@snack.store', password: 'incorrecta' }));
    httpMock
      .expectOne(`${environment.apiUrl}/api/auth/login`)
      .flush({ message: 'Credenciales inválidas' }, { status: 401, statusText: 'Unauthorized' });

    let rejected = false;
    try {
      await promise;
    } catch {
      rejected = true;
    }
    expect(rejected).toBe(true);
    expect(service.isAuthenticated()).toBe(false);
    expect(service.token()).toBeNull();
  });

  it('registers a new user and authenticates it', async () => {
    const promise = firstValueFrom(
      service.register({
        email: 'nuevo@test.local',
        password: 'ClaveSegura123!',
        firstName: 'Nuevo',
        lastName: 'Usuario'
      })
    );
    const req = httpMock.expectOne(`${environment.apiUrl}/api/auth/register`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toMatchObject({ email: 'nuevo@test.local' });
    req.flush({
      accessToken: 'token-nuevo',
      user: {
        id: 'u2',
        email: 'nuevo@test.local',
        firstName: 'Nuevo',
        lastName: 'Usuario',
        role: 'CUSTOMER'
      }
    });

    await promise;
    expect(service.isAuthenticated()).toBe(true);
    expect(service.user()?.email).toBe('nuevo@test.local');
  });

  it('captures the token from the bare `token` field on login', async () => {
    const promise = firstValueFrom(service.login({ email: 'cliente@snack.store', password: 'Demo123!' }));
    httpMock
      .expectOne(`${environment.apiUrl}/api/auth/login`)
      .flush({ token: 'token-bare', user: { id: 'u1', email: 'cliente@snack.store', role: 'CUSTOMER' } });

    await promise;
    expect(service.token()).toBe('token-bare');
    expect(service.isAuthenticated()).toBe(true);
  });

  it('fetches the profile when login returns a token but no user', async () => {
    const promise = firstValueFrom(service.login({ email: 'cliente@snack.store', password: 'Demo123!' }));
    // El backend solo devuelve el token: la sesión queda iniciada sin perfil.
    httpMock.expectOne(`${environment.apiUrl}/api/auth/login`).flush({ access_token: 'token-fake' });

    await promise;
    expect(service.isAuthenticated()).toBe(true);
    expect(service.user()).toBeNull();

    // Se dispara el profile() automático para completar el perfil.
    httpMock.expectOne(`${environment.apiUrl}/api/auth/profile`).flush({
      id: 'u1',
      email: 'cliente@snack.store',
      firstName: 'Cliente',
      lastName: 'Demo',
      role: 'CUSTOMER'
    });
    expect(service.user()?.firstName).toBe('Cliente');
  });

  it('does not authenticate when the register response has no token', async () => {
    const promise = firstValueFrom(
      service.register({
        email: 'nuevo@test.local',
        password: 'ClaveSegura123!',
        firstName: 'Nuevo',
        lastName: 'Usuario'
      })
    );
    httpMock.expectOne(`${environment.apiUrl}/api/auth/register`).flush({ user: undefined });

    await promise;
    expect(service.isAuthenticated()).toBe(false);
    expect(service.token()).toBeNull();
  });

  it('rejects when loading the profile fails with 401 and keeps the session closed', async () => {
    const promise = firstValueFrom(service.profile());
    httpMock
      .expectOne(`${environment.apiUrl}/api/auth/profile`)
      .flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    let rejected = false;
    try {
      await promise;
    } catch {
      rejected = true;
    }
    expect(rejected).toBe(true);
    expect(service.user()).toBeNull();
  });

  it('loads the profile from the API and updates the user signal', async () => {
    const promise = firstValueFrom(service.profile());
    const req = httpMock.expectOne(`${environment.apiUrl}/api/auth/profile`);
    req.flush({ id: 'u1', email: 'perfil@test.local', firstName: 'Perfil', lastName: 'Demo', role: 'CUSTOMER' });

    await promise;
    expect(service.user()?.email).toBe('perfil@test.local');
  });

  it('logs out clearing the token and the user', async () => {
    const loginPromise = firstValueFrom(service.login({ email: 'cliente@snack.store', password: 'Demo123!' }));
    httpMock.expectOne(`${environment.apiUrl}/api/auth/login`).flush({
      access_token: 'token-fake',
      user: { id: 'u1', email: 'cliente@snack.store', firstName: 'Cliente', role: 'CUSTOMER' }
    });
    await loginPromise;
    expect(service.isAuthenticated()).toBe(true);

    service.logout();
    expect(service.isAuthenticated()).toBe(false);
    expect(service.user()).toBeNull();
    expect(localStorage.getItem('snack_store_token')).toBeNull();
  });

  it('stores the refresh token when login returns one', async () => {
    const promise = firstValueFrom(service.login({ email: 'cliente@snack.store', password: 'Demo123!' }));
    httpMock.expectOne(`${environment.apiUrl}/api/auth/login`).flush({
      access_token: 'token-fake',
      refresh_token: 'refresh-fake',
      user: { id: 'u1', email: 'cliente@snack.store', role: 'CUSTOMER' }
    });

    await promise;
    expect(service.refreshToken()).toBe('refresh-fake');
    expect(localStorage.getItem('snack_store_refresh_token')).toBe('refresh-fake');
  });

  it('refreshes the access token with the stored refresh token (rotation)', async () => {
    const loginPromise = firstValueFrom(service.login({ email: 'cliente@snack.store', password: 'Demo123!' }));
    httpMock.expectOne(`${environment.apiUrl}/api/auth/login`).flush({
      access_token: 'token-viejo',
      refresh_token: 'refresh-viejo',
      user: { id: 'u1', email: 'cliente@snack.store', role: 'CUSTOMER' }
    });
    await loginPromise;

    const promise = firstValueFrom(service.refresh());
    const req = httpMock.expectOne(`${environment.apiUrl}/api/auth/refresh`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ refreshToken: 'refresh-viejo' });
    req.flush({ accessToken: 'token-nuevo', refreshToken: 'refresh-nuevo' });

    await promise;
    expect(service.token()).toBe('token-nuevo');
    expect(service.refreshToken()).toBe('refresh-nuevo');
    expect(service.isAuthenticated()).toBe(true);
  });

  it('fails fast when refreshing without a stored refresh token', async () => {
    const promise = firstValueFrom(service.refresh());
    let rejected = false;
    try {
      await promise;
    } catch {
      rejected = true;
    }
    expect(rejected).toBe(true);
    expect(service.isAuthenticated()).toBe(false);
  });

  it('revokes the session on the server when logging out with a refresh token', async () => {
    const loginPromise = firstValueFrom(service.login({ email: 'cliente@snack.store', password: 'Demo123!' }));
    httpMock.expectOne(`${environment.apiUrl}/api/auth/login`).flush({
      access_token: 'token-fake',
      refresh_token: 'refresh-fake',
      user: { id: 'u1', email: 'cliente@snack.store', role: 'CUSTOMER' }
    });
    await loginPromise;

    service.logout();
    const req = httpMock.expectOne(`${environment.apiUrl}/api/auth/logout`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ refreshToken: 'refresh-fake' });
    req.flush({});

    expect(service.isAuthenticated()).toBe(false);
    expect(service.refreshToken()).toBeNull();
    expect(localStorage.getItem('snack_store_token')).toBeNull();
    expect(localStorage.getItem('snack_store_refresh_token')).toBeNull();
  });
});
