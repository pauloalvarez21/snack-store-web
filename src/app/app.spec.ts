import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { App } from './app';
import { AuthService } from './core/services/auth.service';
import { CartService } from './core/services/cart.service';
import { ThemeService } from './core/services/theme.service';

describe('App', () => {
  let auth: AuthService;
  let fixture: ComponentFixture<App>;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();
    auth = TestBed.inject(AuthService);
  });

  function createFixture(): ComponentFixture<App> {
    const f = TestBed.createComponent(App);
    f.detectChanges();
    return f;
  }

  function setSession(role: string): void {
    auth.token.set('token-fake');
    auth.user.set({
      id: 'u1',
      email: 'usuario@snack.store',
      firstName: 'Ana',
      lastName: 'Pérez',
      role
    });
  }

  it('should create the app', () => {
    expect(createFixture().componentInstance).toBeTruthy();
  });

  it('should render the brand', () => {
    fixture = createFixture();
    expect(fixture.nativeElement.querySelector('.brand-name')?.textContent).toContain('SnackStore');
  });

  it('shows the login link for guests', () => {
    fixture = createFixture();
    expect(fixture.nativeElement.querySelector('.login-link')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.user-chip')).toBeNull();
    expect(fixture.nativeElement.querySelector('.app-nav')?.textContent?.trim()).toBe('Catálogo');
  });

  it('shows the customer links and user chip for an authenticated customer', () => {
    fixture = createFixture();
    setSession('CUSTOMER');
    fixture.detectChanges();

    const nav = fixture.nativeElement.querySelector('.app-nav') as HTMLElement;
    expect(nav.textContent).toContain('Mis pedidos');
    expect(nav.textContent).toContain('Perfil');
    expect(nav.textContent).toContain('Direcciones');
    expect(nav.textContent).not.toContain('Pedidos');
    expect(nav.textContent).not.toContain('Administrar');
    expect(fixture.nativeElement.querySelector('.user-name')?.textContent).toContain('Ana Pérez');
    expect(fixture.nativeElement.querySelector('.login-link')).toBeNull();
    expect(fixture.nativeElement.querySelector('.logout-btn')).toBeTruthy();
  });

  it('shows the orders panel link for DELIVERY staff', () => {
    fixture = createFixture();
    setSession('DELIVERY');
    fixture.detectChanges();

    const nav = fixture.nativeElement.querySelector('.app-nav') as HTMLElement;
    expect(nav.textContent).toContain('Pedidos');
    expect(nav.textContent).not.toContain('Mis pedidos');
    expect(nav.textContent).not.toContain('Administrar');
  });

  it('shows the admin link for ADMIN', () => {
    fixture = createFixture();
    setSession('ADMIN');
    fixture.detectChanges();

    const nav = fixture.nativeElement.querySelector('.app-nav') as HTMLElement;
    expect(nav.textContent).toContain('Pedidos');
    expect(nav.textContent).toContain('Administrar');
  });

  it('logs out from the header clearing the session', () => {
    fixture = createFixture();
    setSession('CUSTOMER');
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.logout-btn') as HTMLButtonElement).click();
    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.user()).toBeNull();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.login-link')).toBeTruthy();
  });

  it('toggles the theme from the header', () => {
    fixture = createFixture();
    const theme = TestBed.inject(ThemeService);
    const before = theme.isDark();
    (fixture.nativeElement.querySelector('.theme-toggle') as HTMLButtonElement).click();
    expect(theme.isDark()).toBe(!before);
  });

  it('opens the cart drawer from the header', () => {
    fixture = createFixture();
    const cart = TestBed.inject(CartService);
    expect(fixture.nativeElement.querySelector('app-cart-drawer')).toBeNull();

    (fixture.nativeElement.querySelector('.cart-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(cart.open()).toBe(true);
    expect(fixture.nativeElement.querySelector('app-cart-drawer')).toBeTruthy();
  });
});
