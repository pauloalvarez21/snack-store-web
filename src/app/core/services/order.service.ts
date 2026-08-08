import { Injectable } from '@angular/core';
import { Observable, delay, of } from 'rxjs';

import { CartItem } from './cart.service';
import { DeliveryInfo, Order } from '../models/order.model';

@Injectable({ providedIn: 'root' })
export class OrderService {
  /**
   * Crea un pedido a partir del carrito.
   * TODO: conectar con POST /api/orders cuando el backend exponga el endpoint.
   * Por ahora devuelve un pedido simulado para completar el flujo de compra.
   */
  createOrder(items: CartItem[], info: DeliveryInfo): Observable<Order> {
    const subtotal = items.reduce(
      (acc, item) => acc + item.quantity * (item.product.salePrice ?? item.product.price),
      0
    );
    const order: Order = {
      id: `SS-${Date.now().toString(36).toUpperCase()}`,
      items: items.map((item) => ({ product: item.product, quantity: item.quantity })),
      subtotal,
      customerName: info.customerName,
      phone: info.phone,
      address: info.address,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    return of(order).pipe(delay(800));
  }
}
