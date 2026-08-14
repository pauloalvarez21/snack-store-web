import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TestRequest } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';

import { environment } from '../../../environments/environment';
import { DeliveriesReport, Order } from '../../core/models/order.model';
import { AuthService } from '../../core/services/auth.service';
import { OrdersPage } from './orders-page';

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

const DELIVERIES_REPORT: DeliveriesReport = {
  data: [
    makeOrder({
      id: 'order-9',
      orderNumber: 210,
      status: 'DELIVERED',
      deliveredBy: { id: 'd-1', email: 'repartidor@snack.store', firstName: 'Repartidor', lastName: 'Demo' }
    })
  ],
  total: 1,
  page: 1,
  limit: 10,
  totalPages: 1,
  summary: { totalDelivered: 3, totalAmount: 12.5, todayDelivered: 1, todayAmount: 2.8 }
};

function paginated(list: Order[], total = list.length) {
  return { data: list, total, page: 1, limit: 10, totalPages: Math.max(1, Math.ceil(total / 10)) };
}

describe('OrdersPage', () => {
  let fixture: ComponentFixture<OrdersPage>;
  let httpMock: HttpTestingController;
  let auth: AuthService;

  function expectOrdersGet(): TestRequest {
    return httpMock.expectOne((req) => req.method === 'GET' && req.url === `${environment.apiUrl}/api/orders`);
  }

  function expectDeliveriesGet(): TestRequest {
    return httpMock.expectOne(
      (req) => req.method === 'GET' && req.url === `${environment.apiUrl}/api/orders/deliveries/me`
    );
  }

  /** Consume las dos peticiones del constructor (pedidos + entregas). */
  function flushInitial(orders: Order[]): void {
    expectOrdersGet().flush(paginated(orders));
    expectDeliveriesGet().flush(DELIVERIES_REPORT);
    fixture.detectChanges();
  }

  /** Expande el primer pedido para ver las acciones del footer. */
  function expandFirstCard(): void {
    (fixture.nativeElement.querySelector('.order-head') as HTMLButtonElement).click();
    fixture.detectChanges();
  }

  /** Cambia el rol activo (el panel reacciona vía isAdmin computed). */
  function setRole(role: 'ADMIN' | 'DELIVERY'): void {
    auth.user.set({
      id: 'u-9',
      email: `${role.toLowerCase()}@snack.store`,
      firstName: role === 'ADMIN' ? 'Admin' : 'Repartidor',
      lastName: 'Demo',
      role
    });
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrdersPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    }).compileComponents();
    auth = TestBed.inject(AuthService);
    auth.user.set({
      id: 'u-9',
      email: 'repartidor@snack.store',
      firstName: 'Repartidor',
      lastName: 'Demo',
      role: 'DELIVERY'
    });
    fixture = TestBed.createComponent(OrdersPage);
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
    vi.restoreAllMocks();
    auth.user.set(null);
  });

  it('loads and renders orders for the DELIVERY role', () => {
    flushInitial([makeOrder(), makeOrder({ id: 'order-2', orderNumber: 212, status: 'DELIVERED' })]);

    const cards = fixture.nativeElement.querySelectorAll('.order-card');
    expect(cards.length).toBe(2);
    expect(cards[0].textContent).toContain('#211');
    expect(cards[1].textContent).toContain('#212');
  });

  it('shows delivery actions only for matching statuses', () => {
    flushInitial([makeOrder({ status: 'PREPARING' })]);
    expandFirstCard();

    // En preparación → se puede marcar en camino, pero no confirmar entrega aún.
    const footer = fixture.nativeElement.querySelector('.order-actions');
    expect(footer.textContent).toContain('Marcar en camino');
    expect(footer.textContent).not.toContain('Confirmar entrega');
    // Sin rol admin, no hay acciones de pago/preparación/cancelación.
    expect(footer.textContent).not.toContain('Confirmar pago');
    expect(footer.textContent).not.toContain('Cancelar pedido');
  });

  it('shows admin-only actions for the ADMIN role', () => {
    setRole('ADMIN');
    flushInitial([makeOrder({ status: 'PENDING' }), makeOrder({ id: 'order-2', orderNumber: 212, status: 'PAID' })]);

    const heads = fixture.nativeElement.querySelectorAll('.order-head');

    // Pedido PENDING: el admin puede confirmar el pago y cancelarlo.
    (heads[0] as HTMLButtonElement).click();
    fixture.detectChanges();
    let footer = fixture.nativeElement.querySelector('.order-actions');
    expect(footer.textContent).toContain('Confirmar pago');
    expect(footer.textContent).toContain('Cancelar pedido');
    expect(footer.textContent).not.toContain('Marcar en preparación');

    // Pedido PAID: ya pagado, pasa a preparación (sin confirmar pago).
    (heads[0] as HTMLButtonElement).click(); // colapsa el primero
    (heads[1] as HTMLButtonElement).click();
    fixture.detectChanges();
    footer = fixture.nativeElement.querySelector('.order-actions');
    expect(footer.textContent).toContain('Marcar en preparación');
    expect(footer.textContent).not.toContain('Confirmar pago');
  });

  it('marks a PREPARING order as en route (delivery)', () => {
    flushInitial([makeOrder({ status: 'PREPARING' })]);
    expandFirstCard();

    const markBtn = Array.from(fixture.nativeElement.querySelectorAll('button')).find((b) =>
      (b as HTMLElement).textContent?.includes('Marcar en camino')
    ) as HTMLButtonElement;
    markBtn.click();

    const patch = httpMock.expectOne(`${environment.apiUrl}/api/orders/order-1/status`);
    expect(patch.request.method).toBe('PATCH');
    expect(patch.request.body).toEqual({ status: 'OUT_FOR_DELIVERY' });
    patch.flush(makeOrder({ status: 'OUT_FOR_DELIVERY' }));
    // Tras la acción se recargan ambas listas (silencioso).
    expectOrdersGet().flush(paginated([makeOrder({ status: 'OUT_FOR_DELIVERY' })]));
    expectDeliveriesGet().flush(DELIVERIES_REPORT);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.order-actions').textContent).toContain('Confirmar entrega');
  });

  it('confirms delivery via the deliver endpoint', () => {
    flushInitial([makeOrder({ status: 'OUT_FOR_DELIVERY' })]);
    expandFirstCard();

    const confirmBtn = Array.from(fixture.nativeElement.querySelectorAll('button')).find((b) =>
      (b as HTMLElement).textContent?.includes('Confirmar entrega')
    ) as HTMLButtonElement;
    confirmBtn.click();

    const deliver = httpMock.expectOne(`${environment.apiUrl}/api/orders/order-1/deliver`);
    expect(deliver.request.method).toBe('POST');
    deliver.flush(makeOrder({ status: 'DELIVERED' }));
    expectOrdersGet().flush(paginated([makeOrder({ status: 'DELIVERED' })]));
    expectDeliveriesGet().flush(DELIVERIES_REPORT);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Entregado');
  });

  it('admin confirms payment and marks preparing', () => {
    setRole('ADMIN');
    flushInitial([makeOrder({ status: 'PENDING' })]);
    expandFirstCard();

    const payBtn = Array.from(fixture.nativeElement.querySelectorAll('button')).find((b) =>
      (b as HTMLElement).textContent?.includes('Confirmar pago')
    ) as HTMLButtonElement;
    payBtn.click();

    const patch = httpMock.expectOne(`${environment.apiUrl}/api/orders/order-1/status`);
    expect(patch.request.body).toEqual({ status: 'PAID' });
    patch.flush(makeOrder({ status: 'PAID' }));
    expectOrdersGet().flush(paginated([makeOrder({ status: 'PAID' })]));
    expectDeliveriesGet().flush(DELIVERIES_REPORT);
    fixture.detectChanges();

    const prepBtn = Array.from(fixture.nativeElement.querySelectorAll('button')).find((b) =>
      (b as HTMLElement).textContent?.includes('Marcar en preparación')
    ) as HTMLButtonElement;
    prepBtn.click();

    const patch2 = httpMock.expectOne(`${environment.apiUrl}/api/orders/order-1/status`);
    expect(patch2.request.body).toEqual({ status: 'PREPARING' });
    patch2.flush(makeOrder({ status: 'PREPARING' }));
    expectOrdersGet().flush(paginated([makeOrder({ status: 'PREPARING' })]));
    expectDeliveriesGet().flush(DELIVERIES_REPORT);
    fixture.detectChanges();
  });

  it('admin cancels an order after confirmation', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    setRole('ADMIN');
    flushInitial([makeOrder({ status: 'PENDING' })]);
    expandFirstCard();

    const cancelBtn = Array.from(fixture.nativeElement.querySelectorAll('button')).find((b) =>
      (b as HTMLElement).textContent?.includes('Cancelar pedido')
    ) as HTMLButtonElement;
    cancelBtn.click();

    const patch = httpMock.expectOne(`${environment.apiUrl}/api/orders/order-1/status`);
    expect(patch.request.body).toEqual({ status: 'CANCELLED' });
    patch.flush(makeOrder({ status: 'CANCELLED' }));
    expectOrdersGet().flush(paginated([makeOrder({ status: 'CANCELLED' })]));
    expectDeliveriesGet().flush(DELIVERIES_REPORT);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Cancelado');
  });

  it('shows the deliveries tab with summary cards and history', () => {
    flushInitial([makeOrder()]);

    const deliveriesTab = Array.from(fixture.nativeElement.querySelectorAll('.tab')).find((el) =>
      (el as HTMLElement).textContent?.includes('Mis entregas')
    ) as HTMLButtonElement;
    deliveriesTab.click();
    fixture.detectChanges();

    const summaryCards = fixture.nativeElement.querySelectorAll('.summary-card');
    expect(summaryCards.length).toBe(4);
    expect(summaryCards[0].textContent).toContain('1'); // entregas de hoy
    expect(summaryCards[1].textContent).toContain('$2.80'); // cobrado hoy
    expect(summaryCards[2].textContent).toContain('3'); // total entregado
    expect(summaryCards[3].textContent).toContain('$12.50'); // monto cobrado

    const rows = fixture.nativeElement.querySelectorAll('.delivery-row');
    expect(rows.length).toBe(1);
    expect(rows[0].textContent).toContain('#210');
  });

  it('shows the error state and retries', () => {
    expectOrdersGet().flush({ message: 'Error' }, { status: 500, statusText: 'Server Error' });
    expectDeliveriesGet().flush(DELIVERIES_REPORT);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No pudimos cargar los pedidos');

    (fixture.nativeElement.querySelector('.state button') as HTMLButtonElement).click();
    // El botón Reintentar solo recarga los pedidos (no las entregas).
    expectOrdersGet().flush(paginated([makeOrder()]));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.order-card').length).toBe(1);
  });
});
