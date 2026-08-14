import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Router } from '@angular/router';
import { vi } from 'vitest';

import { environment } from '../../../environments/environment';
import { CartResponse } from '../../core/models/cart.model';
import { Product } from '../../core/models/product.model';
import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';
import { ProductCard } from './product-card';

const PRODUCT: Product = {
  id: 'p-1',
  categoryId: 'c-1',
  category: { id: 'c-1', name: 'Bebidas', slug: 'bebidas', description: null, parentId: null, isActive: true },
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
};

const CART_RESPONSE: CartResponse = {
  id: 'cart-1',
  items: [
    {
      productId: 'p-1',
      quantity: 1,
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
      subtotal: 1400
    }
  ],
  itemsCount: 1,
  subtotal: 1400,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z'
};

describe('ProductCard — compra rápida', () => {
  let fixture: ComponentFixture<ProductCard>;
  let httpMock: HttpTestingController;
  let cart: CartService;
  let auth: AuthService;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductCard],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    }).compileComponents();
    fixture = TestBed.createComponent(ProductCard);
    fixture.componentRef.setInput('product', PRODUCT);
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
    cart.reset();
    cart.open.set(false);
  });

  it('renders the product with its add-to-cart button', () => {
    expect(fixture.nativeElement.textContent).toContain('Agua Mineral 1.5L');
    expect(fixture.nativeElement.textContent).toContain('$1,400.00');
    const btn = fixture.nativeElement.querySelector('.add-btn') as HTMLButtonElement;
    expect(btn.getAttribute('aria-label')).toBe('Agregar Agua Mineral 1.5L al carrito');
  });

  it('uses the local placeholder when the product has no image', () => {
    const img = fixture.nativeElement.querySelector('.media img') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('images/product-placeholder.svg');
  });

  it('falls back to the local placeholder when the product image fails to load', () => {
    fixture.componentRef.setInput('product', { ...PRODUCT, imageUrl: 'https://cdn.example/rota.png' });
    fixture.detectChanges();

    const img = fixture.nativeElement.querySelector('.media img') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('https://cdn.example/rota.png');

    img.dispatchEvent(new Event('error'));
    fixture.detectChanges();

    expect(img.getAttribute('src')).toBe('images/product-placeholder.svg');
  });

  it('adds the product to the cart and opens the drawer when authenticated', () => {
    auth.token.set('token-fake');
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.add-btn') as HTMLButtonElement).click();

    const post = httpMock.expectOne(`${environment.apiUrl}/api/carts/me/items`);
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual({ productId: 'p-1', quantity: 1 });
    post.flush(CART_RESPONSE);
    fixture.detectChanges();

    // El ítem quedó en el carrito y el drawer se abrió.
    expect(cart.items().length).toBe(1);
    expect(cart.items()[0].product.id).toBe('p-1');
    expect(cart.items()[0].quantity).toBe(1);
    expect(cart.count()).toBe(1);
    expect(cart.open()).toBe(true);
  });

  it('sends a guest to login instead of calling the API', () => {
    // Sin sesión (token null).
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    (fixture.nativeElement.querySelector('.add-btn') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(navigate).toHaveBeenCalledWith(['/auth'], { queryParams: { returnUrl: '/' } });
    expect(cart.open()).toBe(false);
    // Ninguna petición de carrito.
    httpMock.expectNone(`${environment.apiUrl}/api/carts/me/items`);
  });

  it('keeps the drawer closed when the add request fails', () => {
    auth.token.set('token-fake');
    fixture.detectChanges();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    (fixture.nativeElement.querySelector('.add-btn') as HTMLButtonElement).click();

    const post = httpMock.expectOne(`${environment.apiUrl}/api/carts/me/items`);
    post.flush({ message: 'Sin stock' }, { status: 400, statusText: 'Bad Request' });
    fixture.detectChanges();

    expect(cart.items().length).toBe(0);
    expect(cart.open()).toBe(false);
  });
});
