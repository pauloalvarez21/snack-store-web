import { Product } from './product.model';

export interface DeliveryInfo {
  customerName: string;
  phone: string;
  address: string;
}

export interface OrderItem {
  product: Product;
  quantity: number;
}

export interface Order {
  id: string;
  items: OrderItem[];
  subtotal: number;
  customerName: string;
  phone: string;
  address: string;
  status: 'pending';
  createdAt: string;
}
