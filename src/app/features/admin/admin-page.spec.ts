import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TestRequest } from '@angular/common/http/testing';
import { vi } from 'vitest';

import { environment } from '../../../environments/environment';
import { Category } from '../../core/models/category.model';
import { InventoryItem } from '../../core/models/inventory.model';
import { Product } from '../../core/models/product.model';
import { AdminPage } from './admin-page';

const PRODUCT: Product = {
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
};

const CATEGORY: Category = {
  id: 'c-1',
  name: 'Bebidas',
  slug: 'bebidas',
  description: null,
  parentId: null,
  isActive: true
};

const INVENTORY: InventoryItem = {
  id: 'inv-1',
  productId: 'p-1',
  product: { id: 'p-1', sku: 'AGUA-1', name: 'Agua Mineral 1.5L', slug: 'agua-mineral-1-5l' },
  stockQuantity: 25,
  minStockLevel: 5,
  stockStatus: 'IN_STOCK',
  expirationDate: null,
  updatedAt: '2026-08-01T00:00:00.000Z'
};

function paginated<T>(list: T[], total = list.length) {
  return { data: list, total, page: 1, limit: 20, totalPages: Math.max(1, Math.ceil(total / 20)) };
}

describe('AdminPage', () => {
  let fixture: ComponentFixture<AdminPage>;
  let httpMock: HttpTestingController;

  function expectProductsGet(): TestRequest {
    return httpMock.expectOne((req) => req.method === 'GET' && req.url === `${environment.apiUrl}/api/products`);
  }

  function expectCategoriesGet(limit: number): TestRequest {
    return httpMock.expectOne(
      (req) =>
        req.method === 'GET' &&
        req.url === `${environment.apiUrl}/api/categories` &&
        req.params.get('limit') === String(limit)
    );
  }

  function expectInventoryGet(): TestRequest {
    return httpMock.expectOne((req) => req.method === 'GET' && req.url === `${environment.apiUrl}/api/inventory`);
  }

  /** Consume las cuatro peticiones del constructor (productos, categorías x2, inventario). */
  function flushInitial(): void {
    expectProductsGet().flush(paginated([PRODUCT]));
    expectCategoriesGet(20).flush(paginated([CATEGORY]));
    expectCategoriesGet(100).flush(paginated([CATEGORY]));
    expectInventoryGet().flush(paginated([INVENTORY]));
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminPage],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();
    fixture = TestBed.createComponent(AdminPage);
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
    vi.restoreAllMocks();
  });

  it('loads and renders products in the default tab', () => {
    flushInitial();

    const rows = fixture.nativeElement.querySelectorAll('.list .row');
    expect(rows.length).toBe(1);
    expect(rows[0].textContent).toContain('Agua Mineral 1.5L');
    expect(rows[0].textContent).toContain('AGUA-1');
    expect(rows[0].textContent).toContain('Activo');
    expect(rows[0].textContent).toContain('$1,400.00');
  });

  it('switches to the categories tab', () => {
    flushInitial();

    const catTab = Array.from(fixture.nativeElement.querySelectorAll('.tab')).find((el) =>
      (el as HTMLElement).textContent?.includes('Categorías')
    ) as HTMLButtonElement;
    catTab.click();
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('.list .row');
    expect(rows.length).toBe(1);
    expect(rows[0].textContent).toContain('Bebidas');
    expect(rows[0].textContent).toContain('/bebidas');
    expect(rows[0].textContent).toContain('Activa');
  });

  it('switches to the inventory tab', () => {
    flushInitial();

    const invTab = Array.from(fixture.nativeElement.querySelectorAll('.tab')).find((el) =>
      (el as HTMLElement).textContent?.includes('Inventario')
    ) as HTMLButtonElement;
    invTab.click();
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('.list .row');
    expect(rows.length).toBe(1);
    expect(rows[0].textContent).toContain('Agua Mineral 1.5L');
    expect(rows[0].textContent).toContain('En stock');
    expect(rows[0].textContent).toContain('Stock: 25 · Mín: 5');
  });

  it('creates a product and reloads the lists', () => {
    flushInitial();

    const addBtn = Array.from(fixture.nativeElement.querySelectorAll('button')).find((b) =>
      (b as HTMLElement).textContent?.includes('Agregar producto')
    ) as HTMLButtonElement;
    addBtn.click();
    fixture.detectChanges();

    const form = fixture.nativeElement.querySelector('.admin-form') as HTMLFormElement;
    expect(form.textContent).toContain('Nuevo producto');

    const set = (name: string, value: string) => {
      const input = form.querySelector(`input[formControlName="${name}"]`) as HTMLInputElement;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    };
    set('name', 'Manzana Roja');
    set('sku', 'MANZ-1');
    set('price', '500');
    set('unit', 'kg');
    fixture.detectChanges();

    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    const post = httpMock.expectOne(`${environment.apiUrl}/api/products`);
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toMatchObject({ name: 'Manzana Roja', sku: 'MANZ-1', price: 500, unit: 'kg' });
    post.flush({ ...PRODUCT, id: 'p-2', name: 'Manzana Roja', sku: 'MANZ-1' });
    // Al guardar se recargan productos e inventario.
    expectProductsGet().flush(paginated([PRODUCT, { ...PRODUCT, id: 'p-2', name: 'Manzana Roja' }]));
    expectInventoryGet().flush(paginated([INVENTORY]));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.list .row').length).toBe(2);
  });

  it('edits a product (pre-filled form) and updates it', () => {
    flushInitial();

    const editBtn = Array.from(fixture.nativeElement.querySelectorAll('button')).find((b) =>
      (b as HTMLElement).textContent?.includes('Editar')
    ) as HTMLButtonElement;
    editBtn.click();
    fixture.detectChanges();

    const form = fixture.nativeElement.querySelector('.admin-form') as HTMLFormElement;
    expect(form.textContent).toContain('Editar producto');
    expect((form.querySelector('input[formControlName="name"]') as HTMLInputElement).value).toBe('Agua Mineral 1.5L');

    const price = form.querySelector('input[formControlName="price"]') as HTMLInputElement;
    price.value = '1600';
    price.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    const patch = httpMock.expectOne(`${environment.apiUrl}/api/products/p-1`);
    expect(patch.request.method).toBe('PATCH');
    expect(patch.request.body).toMatchObject({ name: 'Agua Mineral 1.5L', price: 1600 });
    patch.flush({ ...PRODUCT, price: 1600 });
    expectProductsGet().flush(paginated([{ ...PRODUCT, price: 1600 }]));
    expectInventoryGet().flush(paginated([INVENTORY]));
    fixture.detectChanges();
  });

  it('toggles a product active/inactive', () => {
    flushInitial();

    const toggleBtn = Array.from(fixture.nativeElement.querySelectorAll('button')).find((b) =>
      (b as HTMLElement).textContent?.includes('Desactivar')
    ) as HTMLButtonElement;
    toggleBtn.click();

    const patch = httpMock.expectOne(`${environment.apiUrl}/api/products/p-1`);
    expect(patch.request.method).toBe('PATCH');
    expect(patch.request.body).toEqual({ isActive: false });
    patch.flush({ ...PRODUCT, isActive: false });
    expectProductsGet().flush(paginated([{ ...PRODUCT, isActive: false }]));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Inactivo');
  });

  it('removes a product after confirmation', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    flushInitial();

    const removeBtn = Array.from(fixture.nativeElement.querySelectorAll('button')).find((b) =>
      (b as HTMLElement).textContent?.includes('Eliminar')
    ) as HTMLButtonElement;
    removeBtn.click();

    const del = httpMock.expectOne(`${environment.apiUrl}/api/products/p-1`);
    expect(del.request.method).toBe('DELETE');
    del.flush(null);
    expectProductsGet().flush(paginated([]));
    expectInventoryGet().flush(paginated([]));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No hay productos');
  });

  it('creates a category', () => {
    flushInitial();

    const catTab = Array.from(fixture.nativeElement.querySelectorAll('.tab')).find((el) =>
      (el as HTMLElement).textContent?.includes('Categorías')
    ) as HTMLButtonElement;
    catTab.click();
    fixture.detectChanges();

    const addBtn = Array.from(fixture.nativeElement.querySelectorAll('button')).find((b) =>
      (b as HTMLElement).textContent?.includes('Agregar categoría')
    ) as HTMLButtonElement;
    addBtn.click();
    fixture.detectChanges();

    const form = fixture.nativeElement.querySelector('.admin-form') as HTMLFormElement;
    const name = form.querySelector('input[formControlName="name"]') as HTMLInputElement;
    name.value = 'Lácteos';
    name.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    const post = httpMock.expectOne(`${environment.apiUrl}/api/categories`);
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toMatchObject({ name: 'Lácteos' });
    post.flush({ ...CATEGORY, id: 'c-2', name: 'Lácteos' });
    // Al guardar se recargan categorías (paginada) y el select de todas.
    expectCategoriesGet(20).flush(paginated([CATEGORY, { ...CATEGORY, id: 'c-2', name: 'Lácteos' }]));
    expectCategoriesGet(100).flush(paginated([CATEGORY, { ...CATEGORY, id: 'c-2', name: 'Lácteos' }]));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.list .row').length).toBe(2);
  });

  it('updates the inventory from the manage form', () => {
    flushInitial();

    const invTab = Array.from(fixture.nativeElement.querySelectorAll('.tab')).find((el) =>
      (el as HTMLElement).textContent?.includes('Inventario')
    ) as HTMLButtonElement;
    invTab.click();
    fixture.detectChanges();

    const manageBtn = Array.from(fixture.nativeElement.querySelectorAll('button')).find((b) =>
      (b as HTMLElement).textContent?.includes('Gestionar')
    ) as HTMLButtonElement;
    manageBtn.click();
    fixture.detectChanges();

    const stockInput = fixture.nativeElement.querySelector(
      'input[formControlName="stockQuantity"]'
    ) as HTMLInputElement;
    stockInput.value = '40';
    stockInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const saveBtn = Array.from(fixture.nativeElement.querySelectorAll('button')).find((b) =>
      (b as HTMLElement).textContent?.trim() === 'Guardar'
    ) as HTMLButtonElement;
    saveBtn.click();

    const patch = httpMock.expectOne(`${environment.apiUrl}/api/inventory/p-1`);
    expect(patch.request.method).toBe('PATCH');
    // El form envía todos los valores (pre-cargados al gestionar).
    expect(patch.request.body).toMatchObject({ stockQuantity: 40 });
    patch.flush({ ...INVENTORY, stockQuantity: 40 });
    expectInventoryGet().flush(paginated([{ ...INVENTORY, stockQuantity: 40 }]));
    expectProductsGet().flush(paginated([PRODUCT]));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Stock: 40');
  });

  it('adjusts the stock by delta', () => {
    flushInitial();

    const invTab = Array.from(fixture.nativeElement.querySelectorAll('.tab')).find((el) =>
      (el as HTMLElement).textContent?.includes('Inventario')
    ) as HTMLButtonElement;
    invTab.click();
    fixture.detectChanges();

    const manageBtn = Array.from(fixture.nativeElement.querySelectorAll('button')).find((b) =>
      (b as HTMLElement).textContent?.includes('Gestionar')
    ) as HTMLButtonElement;
    manageBtn.click();
    fixture.detectChanges();

    const adjustInput = fixture.nativeElement.querySelector(
      '.adjust input[formControlName="quantity"]'
    ) as HTMLInputElement;
    adjustInput.value = '-5';
    adjustInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const adjustForm = fixture.nativeElement.querySelector('.adjust') as HTMLFormElement;
    adjustForm.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    const adjust = httpMock.expectOne(`${environment.apiUrl}/api/inventory/p-1/adjust`);
    expect(adjust.request.method).toBe('POST');
    expect(adjust.request.body).toEqual({ quantity: -5 });
    adjust.flush({ ...INVENTORY, stockQuantity: 20 });
    expectInventoryGet().flush(paginated([{ ...INVENTORY, stockQuantity: 20 }]));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Stock: 20');
  });

  it('shows the error state and retries', () => {
    expectProductsGet().flush({ message: 'Error' }, { status: 500, statusText: 'Server Error' });
    expectCategoriesGet(20).flush(paginated([CATEGORY]));
    expectCategoriesGet(100).flush(paginated([CATEGORY]));
    expectInventoryGet().flush(paginated([INVENTORY]));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No pudimos cargar los productos');

    (fixture.nativeElement.querySelector('.state button') as HTMLButtonElement).click();
    expectProductsGet().flush(paginated([PRODUCT]));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.list .row').length).toBe(1);
  });
});
