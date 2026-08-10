import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Router } from '@angular/router';
import { vi } from 'vitest';

import { environment } from '../../../environments/environment';
import { CartResponse } from '../../core/models/cart.model';
import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';
import { CartDrawer } from './cart-drawer';

const CART_RESPONSE: CartResponse = {
  id: 'cart-1',
  items: [
    {
      productId: 'p-1',
      quantity: 2,
      product: {
        id: 'p-1',
        sku: 'AGUA-1',
        name: 'Agua Mineral 1.5L',
        slug: 'agua-mineral-1-5l',
        price: 1400,
        salePrice: null,
        unit: 'botella',
        imageUrl: null,
        inStock: true,
        stockStatus: 'IN_STOCK'
      },
      subtotal: 2800
    }
  ],
  itemsCount: 2,
  subtotal: 2800,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z'
};

describe('CartDrawer', () => {
  let fixture: ComponentFixture<CartDrawer>;
  let httpMock: HttpTestingController;
  let cart: CartService;
  let auth: AuthService;
  let router: Router;

  /** Sesión iniciada + carrito con un ítem (Agua ×2). */
  function seedCart(): void {
    auth.token.set('token-fake');
    cart.add({
      id: 'p-1',
      categoryId: null,
      sku: 'AGUA-1',
      name: 'Agua Mineral 1.5L',
      slug: 'agua-mineral-1-5l',
      description: null,
      price: 1400,
      salePrice: null,
      unit: 'botella',
      isPerishable: false,
      isOrganic: false,
      imageUrl: null,
      isActive: true
    });
    httpMock.expectOne(`${environment.apiUrl}/api/carts/me/items`).flush(CART_RESPONSE);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CartDrawer],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    }).compileComponents();
    fixture = TestBed.createComponent(CartDrawer);
    cart = TestBed.inject(CartService);
    auth = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
    vi.restoreAllMocks();
    auth.token.set(null);
    auth.user.set(null);
  });

  it('asks a guest to log in to see the cart', () => {
    // Sin sesión (token null).
    expect(fixture.nativeElement.textContent).toContain('Inicia sesión para ver tu carrito');
    expect(fixture.nativeElement.querySelector('.cart-empty')).toBeTruthy();
  });

  it('shows the empty state for an authenticated user with no items', () => {
    auth.token.set('token-fake');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Tu carrito está vacío');
  });

  it('renders items, quantities and the subtotal', () => {
    seedCart();

    expect(fixture.nativeElement.textContent).toContain('Agua Mineral 1.5L');
    expect(fixture.nativeElement.textContent).toContain('2');
    expect(fixture.nativeElement.textContent).toContain('$2,800.00');
  });

  it('increases and decreases the quantity via the stepper', () => {
    seedCart();

    const btns = fixture.nativeElement.querySelectorAll('.stepper button');
    // botón "+" (segundo) → PATCH cantidad 3.
    (btns[1] as HTMLButtonElement).click();
    const patchUp = httpMock.expectOne(`${environment.apiUrl}/api/carts/me/items/p-1`);
    expect(patchUp.request.method).toBe('PATCH');
    expect(patchUp.request.body).toEqual({ quantity: 3 });
    patchUp.flush({ ...CART_RESPONSE, items: [{ ...CART_RESPONSE.items[0], quantity: 3 }], itemsCount: 3, subtotal: 4200 });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('3');

    // botón "−" (primero) → PATCH cantidad 2.
    (btns[0] as HTMLButtonElement).click();
    const patchDown = httpMock.expectOne(`${environment.apiUrl}/api/carts/me/items/p-1`);
    expect(patchDown.request.body).toEqual({ quantity: 2 });
    patchDown.flush(CART_RESPONSE);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('2');
  });

  it('removes an item from the cart', () => {
    seedCart();

    const removeBtn = fixture.nativeElement.querySelector('.remove') as HTMLButtonElement;
    removeBtn.click();

    const del = httpMock.expectOne(`${environment.apiUrl}/api/carts/me/items/p-1`);
    expect(del.request.method).toBe('DELETE');
    del.flush(null);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Tu carrito está vacío');
  });

  it('clears the whole cart', () => {
    seedCart();

    const clearBtn = Array.from(fixture.nativeElement.querySelectorAll('button')).find((b) =>
      (b as HTMLElement).textContent?.includes('Vaciar carrito')
    ) as HTMLButtonElement;
    clearBtn.click();

    const del = httpMock.expectOne(`${environment.apiUrl}/api/carts/me`);
    expect(del.request.method).toBe('DELETE');
    del.flush(null);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Tu carrito está vacío');
  });

  it('goes to checkout when authenticated', () => {
    seedCart();
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    const checkoutBtn = Array.from(fixture.nativeElement.querySelectorAll('button')).find((b) =>
      (b as HTMLElement).textContent?.includes('Finalizar compra')
    ) as HTMLButtonElement;
    checkoutBtn.click();

    expect(navigate).toHaveBeenCalledWith(['/checkout']);
    expect(cart.open()).toBe(false);
  });

  it('sends a guest to login with a return URL', () => {
    // Sin sesión: el drawer invita a iniciar sesión y guarda la URL de retorno.
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    const loginBtn = Array.from(fixture.nativeElement.querySelectorAll('button')).find((b) =>
      (b as HTMLElement).textContent?.includes('Iniciar sesión')
    ) as HTMLButtonElement;
    loginBtn.click();

    expect(navigate).toHaveBeenCalledWith(['/auth'], { queryParams: { returnUrl: '/' } });
    expect(cart.open()).toBe(false);
  });
});
