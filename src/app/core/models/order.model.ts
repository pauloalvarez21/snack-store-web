import { Paginated } from './paginated.model';

export type OrderStatus =
  | 'PENDING'
  | 'PAID'
  | 'PREPARING'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED';

export type PaymentMethod = 'NEQUI' | 'DAVIPLATA' | 'CASH_ON_DELIVERY';

export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';

export interface OrderQuery {
  page?: number;
  limit?: number;
  status?: OrderStatus;
}

export interface CreateOrderDto {
  addressId?: string;
  deliverySlotStart?: string;
  deliverySlotEnd?: string;
  paymentMethod: PaymentMethod;
}

export interface OrderItem {
  productId: string | null;
  productName: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export interface OrderPayment {
  id: string;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionId: string | null;
  /** Número de billetera (Nequi/Daviplata) para que el cliente consigne. */
  walletNumber: string | null;
  amount: number;
}

export interface OrderShippingAddress {
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  stateProvince: string | null;
  postalCode: string | null;
  deliveryNotes: string | null;
}

export interface OrderUserRef {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface Order {
  id: string;
  orderNumber: number;
  userId: string;
  user: OrderUserRef | null;
  /** Repartidor que confirmó la entrega (null hasta DELIVERED). */
  deliveredBy: OrderUserRef | null;
  status: OrderStatus;
  subtotal: number;
  deliveryFee: number;
  total: number;
  deliverySlotStart: string | null;
  deliverySlotEnd: string | null;
  /** Snapshot inmutable de la dirección al momento de la compra. */
  shippingAddress: OrderShippingAddress | null;
  items: OrderItem[];
  payment: OrderPayment | null;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveriesSummary {
  totalDelivered: number;
  totalAmount: number;
  todayDelivered: number;
  todayAmount: number;
}

/** Respuesta de GET /api/orders/deliveries/me (historial + resumen). */
export interface DeliveriesReport extends Paginated<Order> {
  summary: DeliveriesSummary;
}
