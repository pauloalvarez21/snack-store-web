import { Category } from './category.model';

export interface Product {
  id: string;
  categoryId: string | null;
  category?: Category;
  sku: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  salePrice: number | null;
  unit: string;
  isPerishable: boolean;
  isOrganic: boolean;
  imageUrl: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateProductDto {
  categoryId?: string;
  sku: string;
  name: string;
  slug?: string;
  description?: string;
  price: number;
  salePrice?: number;
  unit: string;
  isPerishable?: boolean;
  isOrganic?: boolean;
  imageUrl?: string;
  isActive?: boolean;
}

export interface UpdateProductDto {
  categoryId?: string | null;
  sku?: string;
  name?: string;
  slug?: string;
  description?: string | null;
  price?: number;
  salePrice?: number | null;
  unit?: string;
  isPerishable?: boolean;
  isOrganic?: boolean;
  imageUrl?: string | null;
  isActive?: boolean;
}
