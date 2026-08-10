import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Router } from '@angular/router';
import { vi } from 'vitest';

import { environment } from '../../../environments/environment';
import { CartResponse } from '../../core/models/cart.model';
import { AuthService } from '../../core/services/auth.service';
import { AuthPage } from './auth-page';

const EMPTY_CART: CartResponse = {
  id: 'cart-1',
  items: [],
  itemsCount: 0,
  subtotal: 0,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z'
};

const LOGIN_RESPONSE = {
  access_token: 'token-fake',
  user: { id: 'u-1', email: 'cliente@snack.store', firstName: 'Ana', lastName: 'Pérez', role: 'CLIENT' }
};

describe('AuthPage', () => {
  let fixture: ComponentFixture<AuthPage>;
  let httpMock: HttpTestingController;
  let auth: AuthService;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuthPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        // Rutas reales para poder navegar a /auth?returnUrl=... y verificar el redirect.
        provideRouter([
          { path: 'auth', component: AuthPage },
          { path: 'checkout', component: AuthPage }
        ])
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(AuthPage);
    auth = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
    vi.restoreAllMocks();
    auth.logout();
  });

  function fill(controlName: string, value: string): void {
    const input = fixture.nativeElement.querySelector(
      `input[formControlName="${controlName}"]`
    ) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function submit(): void {
    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  function goToRegister(): void {
    const tab = Array.from(fixture.nativeElement.querySelectorAll('.tab')).find((el) =>
      (el as HTMLElement).textContent?.includes('Crear cuenta')
    ) as HTMLButtonElement;
    tab.click();
    fixture.detectChanges();
  }

  it('renders the login form by default', () => {
    expect(fixture.nativeElement.querySelector('h1').textContent).toContain('Iniciar sesión');
    expect(fixture.nativeElement.querySelector('input[formControlName="email"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('input[formControlName="password"]')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Ingresar');
    expect(fixture.nativeElement.textContent).toContain('Crear cuenta');
  });

  it('switches between login and register modes', () => {
    goToRegister();

    expect(fixture.nativeElement.querySelector('h1').textContent).toContain('Crear cuenta');
    for (const name of ['firstName', 'lastName', 'email', 'phone', 'password']) {
      expect(fixture.nativeElement.querySelector(`input[formControlName="${name}"]`)).toBeTruthy();
    }
    expect(fixture.nativeElement.textContent).toContain('Regístrate como cliente');

    // Vuelve a login.
    const loginTab = Array.from(fixture.nativeElement.querySelectorAll('.tab')).find((el) =>
      (el as HTMLElement).textContent?.includes('Ingresar')
    ) as HTMLButtonElement;
    loginTab.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h1').textContent).toContain('Iniciar sesión');
  });

  it('validates the login form without calling the API', () => {
    const submitBtn = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);

    submit();

    const errors = fixture.nativeElement.querySelectorAll('.field-error');
    expect(errors.length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('Este campo es obligatorio');
    httpMock.expectNone(`${environment.apiUrl}/api/auth/login`);
  });

  it('logs in and redirects to the catalog', () => {
    const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    fill('email', 'cliente@snack.store');
    fill('password', 'Demo123!');
    submit();

    const login = httpMock.expectOne(`${environment.apiUrl}/api/auth/login`);
    expect(login.request.method).toBe('POST');
    expect(login.request.body).toEqual({ email: 'cliente@snack.store', password: 'Demo123!' });
    login.flush(LOGIN_RESPONSE);
    fixture.detectChanges();

    // Al autenticarse se recarga el carrito del servidor.
    const cartReq = httpMock.expectOne(`${environment.apiUrl}/api/carts/me`);
    cartReq.flush(EMPTY_CART);
    fixture.detectChanges();

    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.user()?.email).toBe('cliente@snack.store');
    expect(navigate).toHaveBeenCalledWith('/catalogo');
  });

  it('goes to the returnUrl after login when provided', async () => {
    // Navegamos con query params reales para que el ActivatedRoute tenga el returnUrl.
    await router.navigate(['/auth'], { queryParams: { returnUrl: '/checkout' } });
    fixture = TestBed.createComponent(AuthPage);
    fixture.detectChanges();

    fill('email', 'cliente@snack.store');
    fill('password', 'Demo123!');
    submit();

    httpMock.expectOne(`${environment.apiUrl}/api/auth/login`).flush(LOGIN_RESPONSE);
    httpMock.expectOne(`${environment.apiUrl}/api/carts/me`).flush(EMPTY_CART);
    fixture.detectChanges();

    // Dejamos navegar al router real y verificamos la URL resultante.
    await fixture.whenStable();
    expect(auth.isAuthenticated()).toBe(true);
    expect(router.url).toContain('/checkout');
  });

  it('shows an error message when login fails', () => {
    const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    fill('email', 'cliente@snack.store');
    fill('password', 'incorrecta');
    submit();

    httpMock.expectOne(`${environment.apiUrl}/api/auth/login`).flush(
      { message: 'Unauthorized' },
      { status: 401, statusText: 'Unauthorized' }
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Credenciales inválidas. Revisa tu email y contraseña.'
    );
    expect(navigate).not.toHaveBeenCalled();
    expect(auth.isAuthenticated()).toBe(false);
  });

  it('validates the register form (required + min length)', () => {
    goToRegister();

    submit();
    expect(fixture.nativeElement.querySelectorAll('.field-error').length).toBe(4);
    expect(fixture.nativeElement.textContent).toContain('Este campo es obligatorio');

    // Contraseña corta → error de mínimo.
    fill('firstName', 'Ana');
    fill('lastName', 'Pérez');
    fill('email', 'ana@snack.store');
    fill('password', 'corta');
    submit();

    expect(fixture.nativeElement.textContent).toContain('Mínimo 8 caracteres');
    httpMock.expectNone(`${environment.apiUrl}/api/auth/register`);
  });

  it('registers a new account and redirects', () => {
    const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    goToRegister();

    fill('firstName', 'Ana');
    fill('lastName', 'Pérez');
    fill('email', 'ana@snack.store');
    fill('phone', '+56912345678');
    fill('password', 'Demo123!');
    submit();

    const register = httpMock.expectOne(`${environment.apiUrl}/api/auth/register`);
    expect(register.request.body).toEqual({
      firstName: 'Ana',
      lastName: 'Pérez',
      email: 'ana@snack.store',
      phone: '+56912345678',
      password: 'Demo123!'
    });
    register.flush(LOGIN_RESPONSE);
    fixture.detectChanges();

    // El registro autenticó: no hay login extra, solo recarga de carrito.
    httpMock.expectOne(`${environment.apiUrl}/api/carts/me`).flush(EMPTY_CART);
    fixture.detectChanges();

    expect(auth.isAuthenticated()).toBe(true);
    expect(navigate).toHaveBeenCalledWith('/catalogo');
  });

  it('logs in after registering when the API returns no token', () => {
    const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    goToRegister();

    fill('firstName', 'Ana');
    fill('lastName', 'Pérez');
    fill('email', 'ana@snack.store');
    fill('password', 'Demo123!');
    submit();

    // El backend crea la cuenta pero no autentica: se hace login explícito.
    httpMock.expectOne(`${environment.apiUrl}/api/auth/register`).flush({ user: undefined });
    fixture.detectChanges();

    const login = httpMock.expectOne(`${environment.apiUrl}/api/auth/login`);
    expect(login.request.body).toEqual({ email: 'ana@snack.store', password: 'Demo123!' });
    login.flush(LOGIN_RESPONSE);
    fixture.detectChanges();

    httpMock.expectOne(`${environment.apiUrl}/api/carts/me`).flush(EMPTY_CART);
    fixture.detectChanges();

    expect(auth.isAuthenticated()).toBe(true);
    expect(navigate).toHaveBeenCalledWith('/catalogo');
  });

  it('shows a message when the email is already registered', () => {
    const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    goToRegister();

    fill('firstName', 'Ana');
    fill('lastName', 'Pérez');
    fill('email', 'existente@snack.store');
    fill('password', 'Demo123!');
    submit();

    httpMock.expectOne(`${environment.apiUrl}/api/auth/register`).flush(
      { message: 'Email already exists' },
      { status: 409, statusText: 'Conflict' }
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Ese email ya está registrado. Intenta iniciar sesión.'
    );
    expect(navigate).not.toHaveBeenCalled();
  });

  it('shows a generic message when registration fails for another reason', () => {
    const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    goToRegister();

    fill('firstName', 'Ana');
    fill('lastName', 'Pérez');
    fill('email', 'ana@snack.store');
    fill('password', 'Demo123!');
    submit();

    httpMock.expectOne(`${environment.apiUrl}/api/auth/register`).flush(
      { message: 'Internal error' },
      { status: 500, statusText: 'Internal Server Error' }
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'No pudimos crear tu cuenta. Inténtalo de nuevo.'
    );
    expect(navigate).not.toHaveBeenCalled();
  });

  it('toggles the password visibility with the eye button', () => {
    const passwordInput = fixture.nativeElement.querySelector(
      'input[formControlName="password"]'
    ) as HTMLInputElement;
    expect(passwordInput.type).toBe('password');

    const eye = fixture.nativeElement.querySelector('.eye') as HTMLButtonElement;
    eye.click();
    fixture.detectChanges();
    expect(passwordInput.type).toBe('text');
    expect(eye.getAttribute('aria-label')).toBe('Ocultar contraseña');

    eye.click();
    fixture.detectChanges();
    expect(passwordInput.type).toBe('password');
  });
});
