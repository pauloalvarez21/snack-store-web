import { OrderStatus, PaymentMethod } from '../models/order.model';
import { Product } from '../models/product.model';
import { UserRole } from '../models/user.model';

/** Formatea un precio numérico como moneda (p. ej. "$2.50"). */
export function formatPrice(value: number): string {
  return (
    '$' +
    value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  );
}

/** Emoji de producto según su nombre (placeholder visual mientras no haya imágenes). */
export function productEmoji(product: Product): string {
  const n = product.name.toLowerCase();
  if (/(manzana|pera)/.test(n)) return '🍎';
  if (/(platano|plátano|banana)/.test(n)) return '🍌';
  if (/(palta|aguacate)/.test(n)) return '🥑';
  if (/(fresa)/.test(n)) return '🍓';
  if (/(limon|limón|naranja)/.test(n)) return '🍋';
  if (/(uvas?|uva)/.test(n)) return '🍇';
  if (/(tomate)/.test(n)) return '🍅';
  if (/(lechuga|hoja|verdura|hortaliza|espinaca)/.test(n)) return '🥬';
  if (/(zanahoria)/.test(n)) return '🥕';
  if (/(papa)/.test(n)) return '🥔';
  if (/(cebolla|ajo)/.test(n)) return '🧅';
  if (/(leche)/.test(n)) return '🥛';
  if (/(yogurt|yogur)/.test(n)) return '🍦';
  if (/(queso)/.test(n)) return '🧀';
  if (/(huevo)/.test(n)) return '🥚';
  if (/(pan)/.test(n)) return '🍞';
  if (/(galleta|oreo)/.test(n)) return '🍪';
  if (/(chocolate)/.test(n)) return '🍫';
  if (/(gomit|caramelo|dulce)/.test(n)) return '🍬';
  if (/(papas fritas|chips|snack)/.test(n)) return '🍟';
  if (/(man[ií]|nuez|fruto seco)/.test(n)) return '🥜';
  if (/(jugo)/.test(n)) return '🧃';
  if (/(agua)/.test(n)) return '💧';
  if (/(gaseosa|refresco|cola)/.test(n)) return '🥤';
  if (/(arroz|pasta|fideo|granos)/.test(n)) return '🍚';
  if (/(lenteja|legumbre|poroto)/.test(n)) return '🫘';
  if (/(at[uú]n|conserva|enlatado)/.test(n)) return '🐟';
  return '🛒';
}

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CREDIT_CARD: 'Tarjeta de crédito',
  DEBIT_CARD: 'Tarjeta de débito',
  CASH_ON_DELIVERY: 'Contra entrega',
  TRANSFER: 'Transferencia bancaria'
};

/** Etiqueta legible de un método de pago. */
export function paymentMethodLabel(method: PaymentMethod): string {
  return PAYMENT_METHOD_LABELS[method] ?? method;
}

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Pendiente',
  PAID: 'Pagado',
  PREPARING: 'En preparación',
  OUT_FOR_DELIVERY: 'En ruta',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado'
};

/** Etiqueta legible de un estado de pedido. */
export function orderStatusLabel(status: OrderStatus): string {
  return ORDER_STATUS_LABELS[status] ?? status;
}

/** Fecha/hora corta local (p. ej. "10 ago, 14:30"). */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('es-CL', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export const USER_ROLES: UserRole[] = ['CUSTOMER', 'ADMIN', 'DELIVERY'];

const USER_ROLE_LABELS: Record<UserRole, string> = {
  CUSTOMER: 'Cliente',
  ADMIN: 'Administrador',
  DELIVERY: 'Repartidor'
};

/** Etiqueta legible de un rol de usuario. */
export function userRoleLabel(role: UserRole): string {
  return USER_ROLE_LABELS[role] ?? role;
}

/** Emoji para una categoría según su nombre. */
export function categoryEmoji(name: string): string {
  const n = name.toLowerCase();
  if (/(fruta)/.test(n)) return '🍎';
  if (/(verdura|hortaliza)/.test(n)) return '🥬';
  if (/(l[áa]cteo|leche)/.test(n)) return '🥛';
  if (/(queso)/.test(n)) return '🧀';
  if (/(huevo)/.test(n)) return '🥚';
  if (/(panader|reposter)/.test(n)) return '🍞';
  if (/(snack|confiter)/.test(n)) return '🍿';
  if (/(dulce)/.test(n)) return '🍬';
  if (/(salado)/.test(n)) return '🥨';
  if (/(bebida|jugo|agua)/.test(n)) return '🥤';
  if (/(abarrote|despensa)/.test(n)) return '🛒';
  if (/(carnes?|pescado|marisco)/.test(n)) return '🥩';
  return '🏷️';
}
