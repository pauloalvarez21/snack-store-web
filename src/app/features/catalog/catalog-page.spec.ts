import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TestRequest } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';

import { environment } from '../../../environments/environment';
import { CartResponse } from '../../core/models/cart.model';
import { Category } from '../../core/models/category.model';
import { Product } from '../../core/models/product.model';
import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';
import { CatalogPage } from './catalog-page';

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

const PARENT_CATEGORY: Category = {
  id: 'c-1',
  name: 'Bebidas',
  slug: 'bebidas',
  description: null,
  parentId: null,
  isActive: true
};

const CHILD_CATEGORY: Category = {
  id: 'c-2',
  name: 'Agua',
  slug: 'agua',
  description: null,
  parentId: 'c-1',
  isActive: true
};

function paginated<T>(list: T[], total = list.length) {
  return { data: list, total, page: 1, limit: 12, totalPages: Math.max(1, Math.ceil(total / 12)) };
}

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

describe('CatalogPage', () => {
  let fixture: ComponentFixture<CatalogPage>;
  let httpMock: HttpTestingController;

  function expectCategoriesGet(): TestRequest {
    return httpMock.expectOne((req) => req.method === 'GET' && req.url === `${environment.apiUrl}/api/categories`);
  }

  function expectProductsGet(): TestRequest {
    return httpMock.expectOne((req) => req.method === 'GET' && req.url === `${environment.apiUrl}/api/products`);
  }

  /** Consume las dos peticiones del constructor (categorías + productos). */
  function flushInitial(products: Product[] = [PRODUCT], categories: Category[] = [PARENT_CATEGORY, CHILD_CATEGORY]): void {
    expectCategoriesGet().flush(paginated(categories, categories.length));
    expectProductsGet().flush(paginated(products));
    fixture.detectChanges();
  }

  let auth: AuthService;
  let cart: CartService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CatalogPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    }).compileComponents();
    fixture = TestBed.createComponent(CatalogPage);
    httpMock = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    cart = TestBed.inject(CartService);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
    vi.useRealTimers();
    vi.restoreAllMocks();
    auth.token.set(null);
    auth.user.set(null);
    cart.reset();
    cart.open.set(false);
  });

  it('loads and renders products and categories', () => {
    flushInitial();

    const cards = fixture.nativeElement.querySelectorAll('app-product-card');
    expect(cards.length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('Agua Mineral 1.5L');
    expect(fixture.nativeElement.textContent).toContain('AGUA-1');
    // Categorías en el sidebar (padres + todas).
    expect(fixture.nativeElement.textContent).toContain('Todas las categorías');
    expect(fixture.nativeElement.textContent).toContain('Bebidas');
  });

  it('expands a parent category and selects a child category', () => {
    flushInitial([], [PARENT_CATEGORY, CHILD_CATEGORY]);

    // Bebidas tiene hijos → al hacer clic expande sus subcategorías.
    const bebidasBtn = Array.from(fixture.nativeElement.querySelectorAll('.category-item')).find((el) =>
      (el as HTMLElement).textContent?.includes('Bebidas')
    ) as HTMLButtonElement;
    bebidasBtn.click();
    fixture.detectChanges();

    const childBtn = Array.from(fixture.nativeElement.querySelectorAll('.category-item.sub')).find((el) =>
      (el as HTMLElement).textContent?.includes('Agua')
    ) as HTMLButtonElement;
    expect(childBtn).toBeTruthy();
    childBtn.click();

    const req = expectProductsGet();
    expect(req.request.params.get('categoryId')).toBe('c-2');
    expect(req.request.params.get('active')).toBe('true');
    req.flush(paginated([{ ...PRODUCT, categoryId: 'c-2' }]));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('app-product-card').length).toBe(1);
  });

  it('searches with debounce and reloads products', () => {
    vi.useFakeTimers();
    flushInitial();

    const input = fixture.nativeElement.querySelector('.search-box input') as HTMLInputElement;
    input.value = 'agua';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    // Antes del debounce no hay petición nueva.
    expect(fixture.nativeElement.querySelectorAll('app-product-card').length).toBe(1);

    vi.advanceTimersByTime(300);
    const req = expectProductsGet();
    expect(req.request.params.get('search')).toBe('agua');
    req.flush(paginated([]));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Sin resultados');
  });

  it('shows the empty state when there are no products', () => {
    flushInitial([]);

    expect(fixture.nativeElement.textContent).toContain('Sin resultados');
    expect(fixture.nativeElement.querySelectorAll('app-product-card').length).toBe(0);
  });

  it('shows the error state and retries', () => {
    expectCategoriesGet().flush(paginated([PARENT_CATEGORY, CHILD_CATEGORY], 2));
    expectProductsGet().flush({ message: 'Error' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No pudimos cargar los productos');

    (fixture.nativeElement.querySelector('.error-state button') as HTMLButtonElement).click();
    expectProductsGet().flush(paginated([PRODUCT]));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('app-product-card').length).toBe(1);
  });

  it('goes to the next page', () => {
    // 24 productos → 2 páginas con límite 12.
    flushInitial(Array.from({ length: 24 }, (_, i) => ({ ...PRODUCT, id: `p-${i}`, sku: `SKU-${i}` })));

    const nextBtn = Array.from(fixture.nativeElement.querySelectorAll('.page-btn')).find((el) =>
      (el as HTMLElement).textContent?.includes('Siguiente')
    ) as HTMLButtonElement;
    nextBtn.click();

    const req = expectProductsGet();
    expect(req.request.params.get('page')).toBe('2');
    req.flush(paginated([PRODUCT], 24));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('app-product-card').length).toBe(1);
  });

  it('adds a product to the cart and opens the drawer from the quick-buy button', () => {
    auth.token.set('token-fake');
    flushInitial();

    // Botón "+" del primer (único) card renderizado.
    const addBtn = (fixture.nativeElement.querySelector('app-product-card .add-btn') as HTMLButtonElement);
    addBtn.click();

    const post = httpMock.expectOne(`${environment.apiUrl}/api/carts/me/items`);
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual({ productId: 'p-1', quantity: 1 });
    post.flush(CART_RESPONSE);
    fixture.detectChanges();

    // El drawer se abrió y el carrito tiene el producto.
    expect(cart.open()).toBe(true);
    expect(cart.count()).toBe(1);
    expect(cart.items()[0].product.id).toBe('p-1');
  });
});
