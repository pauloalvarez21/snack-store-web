import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TestRequest } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';

import { environment } from '../../../environments/environment';
import { CartResponse } from '../../core/models/cart.model';
import { Order } from '../../core/models/order.model';
import { CartService } from '../../core/services/cart.service';
import { MyOrdersPage } from './my-orders-page';

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'order-1',
    orderNumber: 211,
    userId: 'u-1',
    user: { id: 'u-1', email: 'cliente@snack.store', firstName: 'Cliente', lastName: 'Demo' },
    deliveredBy: null,
    status: 'PAID',
    subtotal: 2.8,
    deliveryFee: 0,
    total: 2.8,
    deliverySlotStart: null,
    deliverySlotEnd: null,
    shippingAddress: {
      addressLine1: 'Av. Providencia 1234',
      addressLine2: null,
      city: 'Santiago',
      stateProvince: 'Región Metropolitana',
      postalCode: null,
      deliveryNotes: null
    },
    items: [{ productId: 'p-1', productName: 'Agua Mineral 1.5L', unitPrice: 1.4, quantity: 2, subtotal: 2.8 }],
    payment: { id: 'pay-1', method: 'NEQUI', status: 'COMPLETED', transactionId: 'SIM-1', walletNumber: '3001234567', amount: 2.8 },
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...overrides
  };
}

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
        price: 1.4,
        salePrice: null,
        unit: 'botella',
        imageUrl: null,
        inStock: true,
        stockStatus: 'IN_STOCK'
      },
      subtotal: 2.8
    }
  ],
  itemsCount: 2,
  subtotal: 2.8,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z'
};

function paginated(list: Order[], total = list.length) {
  return { data: list, total, page: 1, limit: 10, totalPages: Math.max(1, Math.ceil(total / 10)) };
}

describe('MyOrdersPage', () => {
  let fixture: ComponentFixture<MyOrdersPage>;
  let httpMock: HttpTestingController;
  let cart: CartService;

  /** GET /api/orders/me (lleva query params, así que matcheamos por req.url). */
  function expectOrdersGet(): TestRequest {
    return httpMock.expectOne((req) => req.method === 'GET' && req.url === `${environment.apiUrl}/api/orders/me`);
  }

  function flushOrders(list: Order[], total = list.length): void {
    const req = expectOrdersGet();
    req.flush(paginated(list, total));
    fixture.detectChanges();
  }

  /** Expande el primer pedido para ver las acciones del footer. */
  function expandFirstCard(): void {
    (fixture.nativeElement.querySelector('.order-head') as HTMLButtonElement).click();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyOrdersPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    }).compileComponents();
    fixture = TestBed.createComponent(MyOrdersPage);
    httpMock = TestBed.inject(HttpTestingController);
    cart = TestBed.inject(CartService);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
    vi.restoreAllMocks();
  });

  it('loads and renders the order list with numbers and totals', () => {
    flushOrders([makeOrder(), makeOrder({ id: 'order-2', orderNumber: 212, status: 'DELIVERED' })]);

    const cards = fixture.nativeElement.querySelectorAll('.order-card');
    expect(cards.length).toBe(2);
    expect(cards[0].textContent).toContain('#211');
    expect(cards[1].textContent).toContain('#212');
    expect(fixture.nativeElement.textContent).toContain('$2.80');
    expect(fixture.nativeElement.textContent).toContain('Pagado');
  });

  it('shows the empty state when there are no orders', () => {
    flushOrders([]);

    expect(fixture.nativeElement.textContent).toContain('Aún no tienes pedidos');
    expect(fixture.nativeElement.querySelector('.order-card')).toBeNull();
  });

  it('shows the error state and retries', () => {
    expectOrdersGet().flush({ message: 'Error' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No pudimos cargar tus pedidos');

    (fixture.nativeElement.querySelector('.state button') as HTMLButtonElement).click();
    flushOrders([makeOrder()]);
    expect(fixture.nativeElement.querySelectorAll('.order-card').length).toBe(1);
  });

  it('filters by status and reloads with the status param', () => {
    flushOrders([makeOrder()]);

    const chip = Array.from(fixture.nativeElement.querySelectorAll('.status-chip')).find((el) =>
      (el as HTMLElement).textContent?.includes('Entregados')
    ) as HTMLButtonElement;
    chip.click();

    const req = expectOrdersGet();
    expect(req.request.params.get('status')).toBe('DELIVERED');
    req.flush(paginated([]));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Aún no tienes pedidos');
  });

  it('expands an order to show the timeline and the items', () => {
    flushOrders([makeOrder()]);

    expect(fixture.nativeElement.querySelector('.order-detail')).toBeNull();
    (fixture.nativeElement.querySelector('.order-head') as HTMLButtonElement).click();
    fixture.detectChanges();

    const detail = fixture.nativeElement.querySelector('.order-detail');
    expect(detail).toBeTruthy();
    expect(detail.textContent).toContain('Agua Mineral 1.5L');
    expect(detail.textContent).toContain('× 2');
    // Línea de seguimiento con sus 5 pasos.
    expect(fixture.nativeElement.querySelectorAll('.timeline-step').length).toBe(5);
  });

  it('cancels a cancellable order after confirmation and reloads', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    flushOrders([makeOrder({ status: 'PENDING' })]);
    expandFirstCard();

    (fixture.nativeElement.querySelector('.btn-cancel') as HTMLButtonElement).click();

    const patch = httpMock.expectOne(`${environment.apiUrl}/api/orders/order-1/status`);
    expect(patch.request.method).toBe('PATCH');
    expect(patch.request.body).toEqual({ status: 'CANCELLED' });
    patch.flush(makeOrder({ status: 'CANCELLED' }));
    // Recarga silenciosa tras cancelar.
    flushOrders([makeOrder({ status: 'CANCELLED' })]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Cancelado');
  });

  it('does not cancel without confirmation', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    flushOrders([makeOrder({ status: 'PENDING' })]);
    expandFirstCard();

    (fixture.nativeElement.querySelector('.btn-cancel') as HTMLButtonElement).click();

    // No se dispara ninguna petición de cambio de estado.
    httpMock.expectNone(`${environment.apiUrl}/api/orders/order-1/status`);
    expect(fixture.nativeElement.querySelectorAll('.order-card').length).toBe(1);
  });

  it('hides the cancel button for non-cancellable orders', () => {
    flushOrders([makeOrder({ status: 'OUT_FOR_DELIVERY' })]);

    expect(fixture.nativeElement.querySelector('.btn-cancel')).toBeNull();
  });

  it('reorders a past order, adding its items back to the cart and opening the drawer', () => {
    flushOrders([makeOrder({ status: 'DELIVERED' })]);
    expandFirstCard();

    const reorderBtn = Array.from(fixture.nativeElement.querySelectorAll('button')).find((b) =>
      (b as HTMLElement).textContent?.includes('Comprar de nuevo')
    ) as HTMLButtonElement;
    reorderBtn.click();

    const post = httpMock.expectOne(`${environment.apiUrl}/api/carts/me/items`);
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual({ productId: 'p-1', quantity: 2 });
    post.flush(CART_RESPONSE);
    fixture.detectChanges();

    expect(cart.items().length).toBe(1);
    expect(cart.open()).toBe(true);
  });

  it('shows an error when reorder cannot add any product', () => {
    // El servicio loguea el error HTTP esperado; lo silenciamos para no ensuciar el output.
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    flushOrders([makeOrder({ status: 'DELIVERED' })]);
    expandFirstCard();

    const reorderBtn = Array.from(fixture.nativeElement.querySelectorAll('button')).find((b) =>
      (b as HTMLElement).textContent?.includes('Comprar de nuevo')
    ) as HTMLButtonElement;
    reorderBtn.click();

    const post = httpMock.expectOne(`${environment.apiUrl}/api/carts/me/items`);
    post.flush({ message: 'Producto agotado' }, { status: 400, statusText: 'Bad Request' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Los productos de este pedido ya no están disponibles');
    expect(cart.open()).toBe(false);
  });
});
