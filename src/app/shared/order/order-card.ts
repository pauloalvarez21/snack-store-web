import { Component, input, output } from '@angular/core';

import { Order } from '../../core/models/order.model';
import { formatDateTime, formatPrice, paymentMethodLabel } from '../../core/utils/format';
import { OrderStatusBadge } from './order-status-badge';

/**
 * Tarjeta expandible de pedido. El encabezado y el detalle (productos, entrega
 * y pago) son compartidos; el contenido extra se proyecta por slots:
 *  - [cardTop]: contenido sobre la grilla (p. ej. línea de seguimiento)
 *  - [cardFooter]: acciones bajo el detalle (p. ej. cancelar / marcar en camino)
 */
@Component({
  selector: 'app-order-card',
  imports: [OrderStatusBadge],
  templateUrl: './order-card.html',
  styleUrl: './order-card.scss'
})
export class OrderCard {
  readonly order = input.required<Order>();
  readonly expanded = input(false);
  /** Muestra el nombre del cliente en el encabezado (vista de repartidor). */
  readonly showCustomer = input(false);

  readonly toggle = output<void>();

  protected readonly formatPrice = formatPrice;
  protected readonly formatDateTime = formatDateTime;
  protected readonly paymentMethodLabel = paymentMethodLabel;

  protected paymentStatusLabel(payment: Order['payment']): string {
    if (!payment) return '';
    switch (payment.status) {
      case 'COMPLETED':
        return 'Pagado';
      case 'FAILED':
        return 'Pago fallido';
      case 'REFUNDED':
        return 'Reembolsado';
      default:
        return 'Pendiente';
    }
  }
}
