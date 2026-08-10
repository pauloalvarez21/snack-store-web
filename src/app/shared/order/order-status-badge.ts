import { Component, computed, input } from '@angular/core';

import { OrderStatus } from '../../core/models/order.model';
import { orderStatusLabel } from '../../core/utils/format';

const STATUS_CLASS: Record<OrderStatus, string> = {
  PENDING: 'st-pending',
  PAID: 'st-paid',
  PREPARING: 'st-preparing',
  OUT_FOR_DELIVERY: 'st-out',
  DELIVERED: 'st-delivered',
  CANCELLED: 'st-cancelled'
};

/** Badge de color con la etiqueta legible de un estado de pedido. */
@Component({
  selector: 'app-order-status-badge',
  imports: [],
  templateUrl: './order-status-badge.html',
  styleUrl: './order-status-badge.scss'
})
export class OrderStatusBadge {
  readonly status = input.required<OrderStatus>();

  protected readonly label = computed(() => orderStatusLabel(this.status()));
  protected readonly className = computed(() => STATUS_CLASS[this.status()] ?? 'st-pending');
}
