import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TestRequest } from '@angular/common/http/testing';
import { vi } from 'vitest';

import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';
import { Category } from '../../core/models/category.model';
import { InventoryItem } from '../../core/models/inventory.model';
import { Product } from '../../core/models/product.model';
import { User } from '../../core/models/user.model';
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

const USER: User = {
  id: 'u-1',
  email: 'cliente@snack.store',
  firstName: 'Cliente',
  lastName: 'Demo',
  phone: '+56912345678',
  role: 'CUSTOMER',
  createdAt: '2026-01-15T10:30:00.000Z'
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

  function expectUsersGet(): TestRequest {
    return httpMock.expectOne((req) => req.method === 'GET' && req.url === `${environment.apiUrl}/api/users`);
  }

  function clickTab(label: string): void {
    const tab = Array.from(fixture.nativeElement.querySelectorAll('.tab')).find((el) =>
      (el as HTMLElement).textContent?.includes(label)
    ) as HTMLButtonElement;
    tab.click();
    fixture.detectChanges();
  }

  /** Consume las cinco peticiones del constructor (productos, categorías x2, inventario, usuarios). */
  function flushInitial(): void {
    expectProductsGet().flush(paginated([PRODUCT]));
    expectCategoriesGet(20).flush(paginated([CATEGORY]));
    expectCategoriesGet(100).flush(paginated([CATEGORY]));
    expectInventoryGet().flush(paginated([INVENTORY]));
    expectUsersGet().flush(paginated([USER]));
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
    vi.useRealTimers();
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
    expectUsersGet().flush(paginated([USER]));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No pudimos cargar los productos');

    (fixture.nativeElement.querySelector('.state button') as HTMLButtonElement).click();
    expectProductsGet().flush(paginated([PRODUCT]));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.list .row').length).toBe(1);
  });

  it('loads and renders users in the users tab', () => {
    flushInitial();
    clickTab('Usuarios');

    const rows = fixture.nativeElement.querySelectorAll('.list .row');
    expect(rows.length).toBe(1);
    expect(rows[0].textContent).toContain('cliente@snack.store');
    expect(rows[0].textContent).toContain('Cliente Demo');
    expect(rows[0].textContent).toContain('Registrado el');
    expect((rows[0].querySelector('.role-select') as HTMLSelectElement).value).toBe('CUSTOMER');
  });

  it('changes a user role from the select and reloads the list', () => {
    flushInitial();
    clickTab('Usuarios');

    const select = fixture.nativeElement.querySelector('.role-select') as HTMLSelectElement;
    select.value = 'DELIVERY';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const patch = httpMock.expectOne(`${environment.apiUrl}/api/users/u-1/role`);
    expect(patch.request.method).toBe('PATCH');
    expect(patch.request.body).toEqual({ role: 'DELIVERY' });
    patch.flush({ ...USER, role: 'DELIVERY' });
    expectUsersGet().flush(paginated([{ ...USER, role: 'DELIVERY' }]));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Rol cambiado a Repartidor');
    expect((fixture.nativeElement.querySelector('.role-select') as HTMLSelectElement).value).toBe('DELIVERY');
  });

  it('filters users by role', () => {
    flushInitial();
    clickTab('Usuarios');

    const filter = fixture.nativeElement.querySelector('.filter-select') as HTMLSelectElement;
    filter.value = 'DELIVERY';
    filter.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const req = expectUsersGet();
    expect(req.request.params.get('role')).toBe('DELIVERY');
    req.flush(paginated([{ ...USER, role: 'DELIVERY' }]));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.list .row').length).toBe(1);
  });

  it('shows the error state when users fail to load', () => {
    expectProductsGet().flush(paginated([PRODUCT]));
    expectCategoriesGet(20).flush(paginated([CATEGORY]));
    expectCategoriesGet(100).flush(paginated([CATEGORY]));
    expectInventoryGet().flush(paginated([INVENTORY]));
    expectUsersGet().flush({ message: 'Error' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();
    clickTab('Usuarios');

    expect(fixture.nativeElement.textContent).toContain('No pudimos cargar los usuarios');
  });

  it('does not reload when selecting the same role filter', () => {
    flushInitial();
    clickTab('Usuarios');

    const filter = fixture.nativeElement.querySelector('.filter-select') as HTMLSelectElement;
    filter.value = 'ALL'; // ya es el filtro activo
    filter.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    httpMock.expectNone((req) => req.method === 'GET' && req.url === `${environment.apiUrl}/api/users`);
  });

  it('shows an error when toggling a product fails', () => {
    flushInitial();

    const toggleBtn = Array.from(fixture.nativeElement.querySelectorAll('button')).find((b) =>
      (b as HTMLElement).textContent?.includes('Desactivar')
    ) as HTMLButtonElement;
    toggleBtn.click();

    const patch = httpMock.expectOne(`${environment.apiUrl}/api/products/p-1`);
    patch.flush({ message: 'Error' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No se pudo cambiar el estado del producto');
  });

  it('does not delete a product without confirmation', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    flushInitial();

    const removeBtn = Array.from(fixture.nativeElement.querySelectorAll('button')).find((b) =>
      (b as HTMLElement).textContent?.includes('Eliminar')
    ) as HTMLButtonElement;
    removeBtn.click();
    fixture.detectChanges();

    httpMock.expectNone(`${environment.apiUrl}/api/products/p-1`);
  });

  it('shows the backend error when creating a product fails', () => {
    flushInitial();

    const addBtn = Array.from(fixture.nativeElement.querySelectorAll('button')).find((b) =>
      (b as HTMLElement).textContent?.includes('Agregar producto')
    ) as HTMLButtonElement;
    addBtn.click();
    fixture.detectChanges();

    const form = fixture.nativeElement.querySelector('.admin-form') as HTMLFormElement;
    const set = (name: string, value: string) => {
      const input = form.querySelector(`input[formControlName="${name}"]`) as HTMLInputElement;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    };
    set('name', 'Manzana');
    set('sku', 'MANZ-1');
    set('price', '500');
    set('unit', 'kg');
    fixture.detectChanges();
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    const post = httpMock.expectOne(`${environment.apiUrl}/api/products`);
    post.flush({ message: 'El SKU ya existe' }, { status: 409, statusText: 'Conflict' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('El SKU ya existe');
  });

  it('uploads a product image and fills the image URL', () => {
    flushInitial();

    const addBtn = Array.from(fixture.nativeElement.querySelectorAll('button')).find((b) =>
      (b as HTMLElement).textContent?.includes('Agregar producto')
    ) as HTMLButtonElement;
    addBtn.click();
    fixture.detectChanges();

    const fileInput = fixture.nativeElement.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(fileInput, 'files', { value: [new File(['x'], 'foto.png', { type: 'image/png' })] });
    fileInput.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const upload = httpMock.expectOne(`${environment.apiUrl}/api/uploads/images`);
    expect(upload.request.method).toBe('POST');
    upload.flush({ imageUrl: 'https://cdn.example/foto.png' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Imagen subida');
    const imageUrl = fixture.nativeElement.querySelector('input[formControlName="imageUrl"]') as HTMLInputElement;
    expect(imageUrl.value).toBe('https://cdn.example/foto.png');
  });

  it('shows the backend error when the image upload fails', () => {
    flushInitial();

    const addBtn = Array.from(fixture.nativeElement.querySelectorAll('button')).find((b) =>
      (b as HTMLElement).textContent?.includes('Agregar producto')
    ) as HTMLButtonElement;
    addBtn.click();
    fixture.detectChanges();

    const fileInput = fixture.nativeElement.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(fileInput, 'files', { value: [new File(['x'], 'foto.txt', { type: 'text/plain' })] });
    fileInput.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const upload = httpMock.expectOne(`${environment.apiUrl}/api/uploads/images`);
    upload.flush({ message: 'Tipo de archivo no permitido' }, { status: 400, statusText: 'Bad Request' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Tipo de archivo no permitido');
  });

  it('rejects an inventory save with no values to update', () => {
    flushInitial();
    clickTab('Inventario');

    const manageBtn = Array.from(fixture.nativeElement.querySelectorAll('button')).find((b) =>
      (b as HTMLElement).textContent?.includes('Gestionar')
    ) as HTMLButtonElement;
    manageBtn.click();
    fixture.detectChanges();

    for (const name of ['stockQuantity', 'minStockLevel', 'expirationDate']) {
      const input = fixture.nativeElement.querySelector(
        `input[formControlName="${name}"]`
      ) as HTMLInputElement;
      input.value = '';
      input.dispatchEvent(new Event('input'));
    }
    fixture.detectChanges();

    const saveBtn = Array.from(fixture.nativeElement.querySelectorAll('button')).find((b) =>
      (b as HTMLElement).textContent?.trim() === 'Guardar'
    ) as HTMLButtonElement;
    saveBtn.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Ingresa al menos un valor');
    httpMock.expectNone(`${environment.apiUrl}/api/inventory/p-1`);
  });

  it('rejects a stock adjustment of 0', () => {
    flushInitial();
    clickTab('Inventario');

    const manageBtn = Array.from(fixture.nativeElement.querySelectorAll('button')).find((b) =>
      (b as HTMLElement).textContent?.includes('Gestionar')
    ) as HTMLButtonElement;
    manageBtn.click();
    fixture.detectChanges();

    const adjustInput = fixture.nativeElement.querySelector(
      '.adjust input[formControlName="quantity"]'
    ) as HTMLInputElement;
    adjustInput.value = '0';
    adjustInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const adjustForm = fixture.nativeElement.querySelector('.adjust') as HTMLFormElement;
    adjustForm.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Ingresa una cantidad distinta de 0');
    httpMock.expectNone(`${environment.apiUrl}/api/inventory/p-1/adjust`);
  });

  it('shows the empty state when no users match the filters', () => {
    expectProductsGet().flush(paginated([PRODUCT]));
    expectCategoriesGet(20).flush(paginated([CATEGORY]));
    expectCategoriesGet(100).flush(paginated([CATEGORY]));
    expectInventoryGet().flush(paginated([INVENTORY]));
    expectUsersGet().flush(paginated([]));
    fixture.detectChanges();
    clickTab('Usuarios');

    expect(fixture.nativeElement.textContent).toContain('Sin resultados');
    expect(fixture.nativeElement.querySelectorAll('.list .row').length).toBe(0);
  });

  it('does not call the API when selecting the current role', () => {
    flushInitial();
    clickTab('Usuarios');

    const select = fixture.nativeElement.querySelector('.role-select') as HTMLSelectElement;
    select.value = 'CUSTOMER'; // ya es el rol actual
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    httpMock.expectNone(`${environment.apiUrl}/api/users/u-1/role`);
  });

  it('marks the current user and disables its role select', () => {
    TestBed.inject(AuthService).user.set({
      id: 'u-1',
      email: 'admin@snack.store',
      firstName: 'Admin',
      role: 'ADMIN'
    });
    flushInitial();
    clickTab('Usuarios');

    expect(fixture.nativeElement.textContent).toContain('Tú');
    expect((fixture.nativeElement.querySelector('.role-select') as HTMLSelectElement).disabled).toBe(true);
  });

  it('searches users with debounce', () => {
    flushInitial();
    clickTab('Usuarios');

    vi.useFakeTimers();
    const input = fixture.nativeElement.querySelector('.search-input') as HTMLInputElement;
    input.value = 'juan';
    input.dispatchEvent(new Event('input'));
    vi.advanceTimersByTime(300);

    const req = expectUsersGet();
    expect(req.request.params.get('search')).toBe('juan');
    req.flush(paginated([USER]));
    fixture.detectChanges();
  });
});
