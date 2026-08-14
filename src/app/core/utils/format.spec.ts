import { Product } from '../models/product.model';
import {
  USER_ROLES,
  categoryEmoji,
  formatDateTime,
  formatPrice,
  orderStatusLabel,
  paymentMethodLabel,
  productEmoji,
  userRoleLabel
} from './format';

function product(name: string): Product {
  return {
    id: 'p1',
    categoryId: null,
    sku: 'X',
    name,
    slug: 'x',
    description: null,
    price: 100,
    salePrice: null,
    unit: 'unidad',
    isPerishable: false,
    isOrganic: false,
    imageUrl: null,
    isActive: true
  };
}

describe('formatPrice', () => {
  it('formats with the currency symbol and two decimals', () => {
    expect(formatPrice(2.5)).toBe('$2.50');
    expect(formatPrice(1400)).toBe('$1,400.00');
    expect(formatPrice(0)).toBe('$0.00');
  });
});

describe('productEmoji', () => {
  it('maps known product names to emojis', () => {
    expect(productEmoji(product('Manzana roja'))).toBe('🍎');
    expect(productEmoji(product('Leche entera'))).toBe('🥛');
    expect(productEmoji(product('Huevos de campo'))).toBe('🥚');
    expect(productEmoji(product('Agua mineral'))).toBe('💧');
    expect(productEmoji(product('Queso mantecoso'))).toBe('🧀');
    expect(productEmoji(product('Plátano'))).toBe('🍌');
  });

  it('falls back to a generic emoji for unknown products', () => {
    expect(productEmoji(product('Producto misterioso'))).toBe('🛒');
  });
});

describe('paymentMethodLabel', () => {
  it('labels the known payment methods', () => {
    expect(paymentMethodLabel('NEQUI')).toBe('Nequi');
    expect(paymentMethodLabel('DAVIPLATA')).toBe('Daviplata');
    expect(paymentMethodLabel('CASH_ON_DELIVERY')).toBe('Contra entrega');
  });
});

describe('orderStatusLabel', () => {
  it('labels the known order statuses', () => {
    expect(orderStatusLabel('PENDING')).toBe('Pendiente');
    expect(orderStatusLabel('PAID')).toBe('Pagado');
    expect(orderStatusLabel('PREPARING')).toBe('En preparación');
    expect(orderStatusLabel('OUT_FOR_DELIVERY')).toBe('En ruta');
    expect(orderStatusLabel('DELIVERED')).toBe('Entregado');
    expect(orderStatusLabel('CANCELLED')).toBe('Cancelado');
  });
});

describe('formatDateTime', () => {
  it('formats a valid ISO date locally', () => {
    const raw = '2026-08-10T14:30:00.000Z';
    const formatted = formatDateTime(raw);
    expect(formatted).not.toBe(raw);
    expect(formatted.length).toBeLessThan(raw.length);
  });

  it('returns the input unchanged for invalid dates', () => {
    expect(formatDateTime('no-es-una-fecha')).toBe('no-es-una-fecha');
  });
});

describe('userRoleLabel and USER_ROLES', () => {
  it('exposes the three roles in order', () => {
    expect(USER_ROLES).toEqual(['CUSTOMER', 'ADMIN', 'DELIVERY']);
  });

  it('labels each role in Spanish', () => {
    expect(userRoleLabel('CUSTOMER')).toBe('Cliente');
    expect(userRoleLabel('ADMIN')).toBe('Administrador');
    expect(userRoleLabel('DELIVERY')).toBe('Repartidor');
  });
});

describe('categoryEmoji', () => {
  it('maps known categories to emojis', () => {
    expect(categoryEmoji('Bebidas')).toBe('🥤');
    expect(categoryEmoji('Verduras')).toBe('🥬');
    expect(categoryEmoji('Lácteos')).toBe('🥛');
    expect(categoryEmoji('Panadería')).toBe('🍞');
    expect(categoryEmoji('Snacks')).toBe('🍿');
  });

  it('falls back to a tag emoji for unknown categories', () => {
    expect(categoryEmoji('Otros')).toBe('🏷️');
  });
});
