import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  CreateOrderDto,
  DeliveriesReport,
  Order,
  OrderQuery,
  OrderStatus,
  PaymentMethod
} from '../models/order.model';
import { Paginated } from '../models/paginated.model';

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly http = inject(HttpClient);

  /**
   * Crea un pedido a partir del carrito del servidor (POST /api/orders).
   * El backend valida stock, congela precios, descuenta inventario, crea el
   * pago simulado y consume el carrito.
   */
  createOrder(paymentMethod: PaymentMethod, addressId?: string): Observable<Order> {
    const dto: CreateOrderDto = { paymentMethod, ...(addressId ? { addressId } : {}) };
    return this.http.post<Order>(`${environment.apiUrl}/api/orders`, dto);
  }

  /** Lista todos los pedidos (solo ADMIN/DELIVERY), opcionalmente por estado. */
  findAll(query: OrderQuery = {}): Observable<Paginated<Order>> {
    return this.http.get<Paginated<Order>>(`${environment.apiUrl}/api/orders`, {
      params: this.buildParams(query)
    });
  }

  /** Pedidos del cliente autenticado (paginado, opcionalmente por estado). */
  findMy(query: OrderQuery = {}): Observable<Paginated<Order>> {
    return this.http.get<Paginated<Order>>(`${environment.apiUrl}/api/orders/me`, {
      params: this.buildParams(query)
    });
  }

  /** Historial de entregas del repartidor autenticado, con resumen agregado. */
  findMyDeliveries(query: OrderQuery = {}): Observable<DeliveriesReport> {
    return this.http.get<DeliveriesReport>(`${environment.apiUrl}/api/orders/deliveries/me`, {
      params: this.buildParams(query)
    });
  }

  /** Cambia el estado de un pedido (DELIVERY: PREPARING → OUT_FOR_DELIVERY). */
  updateStatus(id: string, status: OrderStatus): Observable<Order> {
    return this.http.patch<Order>(`${environment.apiUrl}/api/orders/${id}/status`, { status });
  }

  /** Confirma la entrega (OUT_FOR_DELIVERY → DELIVERED) y cobra el contra entrega. */
  deliver(id: string): Observable<Order> {
    return this.http.post<Order>(`${environment.apiUrl}/api/orders/${id}/deliver`, null);
  }

  private buildParams(query: OrderQuery): HttpParams {
    let params = new HttpParams();
    if (query.page) params = params.set('page', String(query.page));
    if (query.limit) params = params.set('limit', String(query.limit));
    if (query.status) params = params.set('status', query.status);
    return params;
  }
}
