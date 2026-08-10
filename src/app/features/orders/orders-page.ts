import { Component, computed, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';

import { DeliveriesSummary, Order, OrderStatus } from '../../core/models/order.model';
import { AuthService } from '../../core/services/auth.service';
import { OrderService } from '../../core/services/order.service';
import { formatDateTime, formatPrice } from '../../core/utils/format';
import { OrderCard } from '../../shared/order/order-card';
import { OrderFilterChips, OrderFilterOption } from '../../shared/order/order-filter-chips';
import { OrderPagination } from '../../shared/order/order-pagination';
import { OrderSkeleton } from '../../shared/order/order-skeleton';
import { OrderStatusBadge } from '../../shared/order/order-status-badge';

type StatusFilter = OrderStatus | 'ALL';

const STATUS_FILTERS: OrderFilterOption[] = [
  { value: 'ALL', label: 'Todos' },
  { value: 'PREPARING', label: 'En preparación' },
  { value: 'OUT_FOR_DELIVERY', label: 'En ruta' },
  { value: 'DELIVERED', label: 'Entregados' },
  { value: 'PAID', label: 'Pagados' },
  { value: 'PENDING', label: 'Pendientes' },
  { value: 'CANCELLED', label: 'Cancelados' }
];

@Component({
  selector: 'app-orders-page',
  imports: [OrderCard, OrderFilterChips, OrderPagination, OrderSkeleton, OrderStatusBadge],
  templateUrl: './orders-page.html',
  styleUrl: './orders-page.scss'
})
export class OrdersPage {
  private readonly orderService = inject(OrderService);
  private readonly auth = inject(AuthService);

  protected readonly tab = signal<'orders' | 'deliveries'>('orders');
  /** Solo el ADMIN puede avanzar pagos y preparación; el DELIVERY entrega. */
  protected readonly isAdmin = computed(() => this.auth.user()?.role === 'ADMIN');
  protected readonly statusFilter = signal<StatusFilter>('ALL');
  protected readonly statusFilters = STATUS_FILTERS;

  // ===== Pedidos =====
  protected readonly orders = signal<Order[]>([]);
  protected readonly ordersPage = signal(1);
  protected readonly limit = signal(10);
  protected readonly ordersTotal = signal(0);
  protected readonly ordersLoading = signal(true);
  protected readonly ordersError = signal(false);
  protected readonly ordersErrorMessage = signal('');
  protected readonly expandedId = signal<string | null>(null);
  protected readonly acting = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);

  // ===== Mis entregas =====
  protected readonly deliveries = signal<Order[]>([]);
  protected readonly deliveriesSummary = signal<DeliveriesSummary | null>(null);
  protected readonly deliveriesPage = signal(1);
  protected readonly deliveriesTotal = signal(0);
  protected readonly deliveriesLoading = signal(true);
  protected readonly deliveriesError = signal(false);
  protected readonly deliveriesErrorMessage = signal('');

  protected readonly ordersTotalPages = computed(() => Math.max(1, Math.ceil(this.ordersTotal() / this.limit())));
  protected readonly deliveriesTotalPages = computed(() =>
    Math.max(1, Math.ceil(this.deliveriesTotal() / this.limit()))
  );

  protected readonly formatPrice = formatPrice;
  protected readonly formatDateTime = formatDateTime;

  constructor() {
    this.loadOrders();
    this.loadDeliveries();
  }

  protected switchTab(tab: 'orders' | 'deliveries'): void {
    this.tab.set(tab);
  }

  protected selectStatus(filter: string): void {
    const value = filter as StatusFilter;
    if (value === this.statusFilter()) return;
    this.statusFilter.set(value);
    this.ordersPage.set(1);
    this.loadOrders();
  }

  protected toggleDetail(id: string): void {
    this.expandedId.set(this.expandedId() === id ? null : id);
  }

  protected canMarkEnRoute(order: Order): boolean {
    return order.status === 'PREPARING';
  }

  protected canConfirmDelivery(order: Order): boolean {
    return order.status === 'OUT_FOR_DELIVERY';
  }

  /** Admin: cobra el pedido pendiente (PENDING → PAID, confirma el pago). */
  protected canConfirmPayment(order: Order): boolean {
    return order.status === 'PENDING';
  }

  /** Admin: pasa un pedido pagado a la cocina (PAID → PREPARING). */
  protected canMarkPreparing(order: Order): boolean {
    return order.status === 'PAID';
  }

  /** Admin: cancela pedidos aún no en ruta ni entregados. */
  protected canCancel(order: Order): boolean {
    return order.status === 'PENDING' || order.status === 'PAID';
  }

  /** El admin confirma el pago del pedido (PENDING → PAID). */
  protected confirmPayment(order: Order): void {
    this.runAction(order, 'PAID');
  }

  /** El admin manda el pedido a la cocina (PAID → PREPARING). */
  protected markPreparing(order: Order): void {
    this.runAction(order, 'PREPARING');
  }

  /** El admin cancela el pedido (con confirmación). */
  protected cancelOrder(order: Order): void {
    if (!window.confirm(`¿Cancelar el pedido #${order.orderNumber}? Esta acción no se puede deshacer.`)) {
      return;
    }
    this.runAction(order, 'CANCELLED');
  }

  /** Ejecuta un cambio de estado y recarga la lista al completarse. */
  private runAction(order: Order, status: OrderStatus): void {
    this.acting.set(order.id);
    this.actionError.set(null);
    this.orderService
      .updateStatus(order.id, status)
      .pipe(finalize(() => this.acting.set(null)))
      .subscribe({
        next: () => this.reloadAfterAction(),
        error: (err) => this.actionError.set(this.actionMessage(err))
      });
  }

  /** El repartidor pone el pedido en ruta (PREPARING → OUT_FOR_DELIVERY). */
  protected markEnRoute(order: Order): void {
    this.runAction(order, 'OUT_FOR_DELIVERY');
  }

  /** Confirma la entrega (OUT_FOR_DELIVERY → DELIVERED, cobra contra entrega). */
  protected confirmDelivery(order: Order): void {
    this.acting.set(order.id);
    this.actionError.set(null);
    this.orderService
      .deliver(order.id)
      .pipe(finalize(() => this.acting.set(null)))
      .subscribe({
        next: () => this.reloadAfterAction(),
        error: (err) => this.actionError.set(this.actionMessage(err))
      });
  }

  protected goToOrdersPage(page: number): void {
    if (page < 1 || page > this.ordersTotalPages() || page === this.ordersPage()) return;
    this.ordersPage.set(page);
    this.loadOrders();
  }

  protected goToDeliveriesPage(page: number): void {
    if (page < 1 || page > this.deliveriesTotalPages() || page === this.deliveriesPage()) return;
    this.deliveriesPage.set(page);
    this.loadDeliveries();
  }

  /** Refresca ambas listas sin mostrar skeletons (el pedido cambió de estado). */
  private reloadAfterAction(): void {
    this.loadOrders(true);
    this.loadDeliveries(true);
  }

  protected loadOrders(silent = false): void {
    if (!silent) {
      this.ordersLoading.set(true);
      this.ordersError.set(false);
      this.ordersErrorMessage.set('');
    }
    const filter = this.statusFilter();
    const status = filter === 'ALL' ? undefined : filter;
    this.orderService
      .findAll({ page: this.ordersPage(), limit: this.limit(), status })
      .subscribe({
        next: (res) => {
          this.orders.set(res.data);
          this.ordersTotal.set(res.total);
          this.ordersPage.set(res.page);
          this.ordersLoading.set(false);
        },
        error: (err) => {
          if (!silent) {
            this.ordersLoading.set(false);
            this.ordersError.set(true);
            this.ordersErrorMessage.set(this.loadErrorMessage(err));
          }
        }
      });
  }

  protected loadDeliveries(silent = false): void {
    if (!silent) {
      this.deliveriesLoading.set(true);
      this.deliveriesError.set(false);
      this.deliveriesErrorMessage.set('');
    }
    this.orderService
      .findMyDeliveries({ page: this.deliveriesPage(), limit: this.limit() })
      .subscribe({
        next: (res) => {
          this.deliveries.set(res.data);
          this.deliveriesSummary.set(res.summary);
          this.deliveriesTotal.set(res.total);
          this.deliveriesPage.set(res.page);
          this.deliveriesLoading.set(false);
        },
        error: (err) => {
          if (!silent) {
            this.deliveriesLoading.set(false);
            this.deliveriesError.set(true);
            this.deliveriesErrorMessage.set(this.loadErrorMessage(err));
          }
        }
      });
  }

  private loadErrorMessage(err: unknown): string {
    if ((err as { status?: number }).status === 403) {
      return 'No tienes permisos para ver esta sección.';
    }
    return 'Verifica que el backend esté disponible e inténtalo de nuevo.';
  }

  private actionMessage(err: unknown): string {
    const message = (err as { error?: { message?: string } }).error?.message;
    return message ?? 'No se pudo realizar la acción. Inténtalo de nuevo.';
  }
}
