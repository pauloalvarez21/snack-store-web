import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { Order, OrderStatus } from '../../core/models/order.model';
import { CartService } from '../../core/services/cart.service';
import { OrderService } from '../../core/services/order.service';
import { OrderCard } from '../../shared/order/order-card';
import { OrderFilterChips, OrderFilterOption } from '../../shared/order/order-filter-chips';
import { OrderPagination } from '../../shared/order/order-pagination';
import { OrderSkeleton } from '../../shared/order/order-skeleton';

type StatusFilter = OrderStatus | 'ALL';

const STATUS_FILTERS: OrderFilterOption[] = [
  { value: 'ALL', label: 'Todos' },
  { value: 'PENDING', label: 'Pendientes' },
  { value: 'PAID', label: 'Pagados' },
  { value: 'PREPARING', label: 'En preparación' },
  { value: 'OUT_FOR_DELIVERY', label: 'En ruta' },
  { value: 'DELIVERED', label: 'Entregados' },
  { value: 'CANCELLED', label: 'Cancelados' }
];

/** Estados en los que el cliente puede cancelar su pedido. */
const CANCELLABLE: OrderStatus[] = ['PENDING', 'PAID'];

/** Pasos del seguimiento del pedido, en orden de avance. */
const PROGRESS_STEPS: { value: OrderStatus; label: string }[] = [
  { value: 'PENDING', label: 'Recibido' },
  { value: 'PAID', label: 'Pagado' },
  { value: 'PREPARING', label: 'En preparación' },
  { value: 'OUT_FOR_DELIVERY', label: 'En ruta' },
  { value: 'DELIVERED', label: 'Entregado' }
];

const STEP_ORDER: Record<OrderStatus, number> = {
  PENDING: 0,
  PAID: 1,
  PREPARING: 2,
  OUT_FOR_DELIVERY: 3,
  DELIVERED: 4,
  CANCELLED: 4
};

@Component({
  selector: 'app-my-orders-page',
  imports: [OrderCard, OrderFilterChips, OrderPagination, OrderSkeleton, RouterLink],
  templateUrl: './my-orders-page.html',
  styleUrl: './my-orders-page.scss'
})
export class MyOrdersPage {
  private readonly orderService = inject(OrderService);
  private readonly cart = inject(CartService);

  protected readonly statusFilter = signal<StatusFilter>('ALL');
  protected readonly statusFilters = STATUS_FILTERS;

  protected readonly orders = signal<Order[]>([]);
  protected readonly ordersPage = signal(1);
  protected readonly limit = signal(10);
  protected readonly ordersTotal = signal(0);
  protected readonly loading = signal(true);
  protected readonly error = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly expandedId = signal<string | null>(null);
  protected readonly cancelling = signal<string | null>(null);
  protected readonly reordering = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.ordersTotal() / this.limit()))
  );
  protected readonly progressSteps = PROGRESS_STEPS;

  constructor() {
    this.load();
  }

  protected selectStatus(filter: string): void {
    const value = filter as StatusFilter;
    if (value === this.statusFilter()) return;
    this.statusFilter.set(value);
    this.ordersPage.set(1);
    this.load();
  }

  protected toggleDetail(id: string): void {
    this.expandedId.set(this.expandedId() === id ? null : id);
  }

  protected canCancel(order: Order): boolean {
    return CANCELLABLE.includes(order.status);
  }

  /** ¿El pedido tiene al menos un producto re-comparable (no eliminado)? */
  protected canReorder(order: Order): boolean {
    return order.items.some((item) => item.productId !== null);
  }

  /** Re-agrega al carrito todos los productos del pedido con sus cantidades. */
  protected reorder(order: Order): void {
    const items = order.items
      .filter((item) => item.productId !== null)
      .map((item) => ({ productId: item.productId!, quantity: item.quantity }));
    if (items.length === 0) return;
    this.reordering.set(order.id);
    this.actionError.set(null);
    this.cart
      .reorder(items)
      .pipe(finalize(() => this.reordering.set(null)))
      .subscribe((added) => {
        if (added === 0) {
          this.actionError.set('Los productos de este pedido ya no están disponibles.');
        } else if (added < items.length) {
          this.actionError.set(`Se agregaron ${added} de ${items.length} productos al carrito.`);
          this.cart.open.set(true);
        } else {
          this.cart.open.set(true);
        }
      });
  }

  /** Si el pedido ya pasó (o está en) ese paso de la línea de tiempo. */
  protected stepDone(order: Order, step: OrderStatus): boolean {
    if (order.status === 'CANCELLED') return false;
    return STEP_ORDER[order.status] >= STEP_ORDER[step];
  }

  protected goToPage(page: number): void {
    if (page < 1 || page > this.totalPages() || page === this.ordersPage()) return;
    this.ordersPage.set(page);
    this.load();
  }

  /** El cliente cancela su pedido (PENDING/PAID → CANCELLED). */
  protected cancelOrder(order: Order): void {
    if (!window.confirm(`¿Cancelar el pedido #${order.orderNumber}? Esta acción no se puede deshacer.`)) {
      return;
    }
    this.cancelling.set(order.id);
    this.actionError.set(null);
    this.orderService
      .updateStatus(order.id, 'CANCELLED')
      .pipe(finalize(() => this.cancelling.set(null)))
      .subscribe({
        next: () => this.load(true),
        error: (err) => this.actionError.set(this.actionMessage(err))
      });
  }

  protected load(silent = false): void {
    if (!silent) {
      this.loading.set(true);
      this.error.set(false);
      this.errorMessage.set('');
    }
    const filter = this.statusFilter();
    const status = filter === 'ALL' ? undefined : filter;
    this.orderService
      .findMy({ page: this.ordersPage(), limit: this.limit(), status })
      .subscribe({
        next: (res) => {
          this.orders.set(res.data);
          this.ordersTotal.set(res.total);
          this.ordersPage.set(res.page);
          this.loading.set(false);
        },
        error: (err) => {
          if (!silent) {
            this.loading.set(false);
            this.error.set(true);
            this.errorMessage.set(this.loadErrorMessage(err));
          }
        }
      });
  }

  private loadErrorMessage(err: unknown): string {
    if ((err as { status?: number }).status === 401) {
      return 'Tu sesión expiró. Vuelve a iniciar sesión para ver tus pedidos.';
    }
    return 'Verifica que el backend esté disponible e inténtalo de nuevo.';
  }

  private actionMessage(err: unknown): string {
    const message = (err as { error?: { message?: string } }).error?.message;
    return message ?? 'No se pudo cancelar el pedido. Inténtalo de nuevo.';
  }
}
