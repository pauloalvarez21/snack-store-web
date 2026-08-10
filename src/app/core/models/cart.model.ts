export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

/** Producto tal como lo devuelve el carrito del servidor (sin categoría ni descripción). */
export interface CartProductInfo {
  id: string;
  sku: string;
  name: string;
  slug: string;
  price: number;
  salePrice: number | null;
  unit: string;
  imageUrl: string | null;
  inStock: boolean;
  stockStatus: StockStatus;
}

export interface CartItemResponse {
  productId: string;
  quantity: number;
  product: CartProductInfo | null;
  /** quantity × precio efectivo (salePrice si existe) */
  subtotal: number;
}

export interface CartResponse {
  id: string;
  items: CartItemResponse[];
  itemsCount: number;
  subtotal: number;
  createdAt: string;
  updatedAt: string;
}
