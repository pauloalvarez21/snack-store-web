export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

export interface InventoryProductRef {
  id: string;
  sku: string;
  name: string;
  slug: string;
}

export interface InventoryItem {
  id: string;
  productId: string;
  product: InventoryProductRef | null;
  stockQuantity: number;
  minStockLevel: number;
  stockStatus: StockStatus;
  expirationDate: string | null;
  updatedAt: string;
}

export interface UpdateInventoryDto {
  stockQuantity?: number;
  minStockLevel?: number;
  expirationDate?: string | null;
}

export interface AdjustInventoryDto {
  quantity: number;
}

export const STOCK_STATUS_LABEL: Record<StockStatus, string> = {
  IN_STOCK: 'En stock',
  LOW_STOCK: 'Stock bajo',
  OUT_OF_STOCK: 'Sin stock'
};
