import { Injectable, computed, signal } from '@angular/core';
import { Product } from '../models/product.model';

export interface CartItem {
  product: Product;
  quantity: number;
}

/** Carrito del cliente (lado frontend): el API aún no expone endpoints de órdenes. */
@Injectable({ providedIn: 'root' })
export class CartService {
  private static readonly STORAGE_KEY = 'snack_store_cart_v1';

  private readonly _items = signal<CartItem[]>(this.load());
  readonly items = this._items.asReadonly();

  readonly count = computed(() => this._items().reduce((acc, item) => acc + item.quantity, 0));
  readonly total = computed(() =>
    this._items().reduce((acc, item) => acc + item.quantity * (item.product.salePrice ?? item.product.price), 0)
  );

  readonly open = signal(false);

  add(product: Product): void {
    this._items.update((items) => {
      const existing = items.find((item) => item.product.id === product.id);
      if (existing) {
        return items.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...items, { product, quantity: 1 }];
    });
    this.persist();
    this.open.set(true);
  }

  increase(id: string): void {
    this.changeQuantity(id, 1);
  }

  decrease(id: string): void {
    this.changeQuantity(id, -1);
  }

  remove(id: string): void {
    this._items.update((items) => items.filter((item) => item.product.id !== id));
    this.persist();
  }

  clear(): void {
    this._items.set([]);
    this.persist();
  }

  private changeQuantity(id: string, delta: number): void {
    this._items.update((items) =>
      items
        .map((item) =>
          item.product.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item
        )
        .filter((item) => item.quantity > 0)
    );
    this.persist();
  }

  private persist(): void {
    localStorage.setItem(CartService.STORAGE_KEY, JSON.stringify(this._items()));
  }

  private load(): CartItem[] {
    try {
      const raw = localStorage.getItem(CartService.STORAGE_KEY);
      return raw ? (JSON.parse(raw) as CartItem[]) : [];
    } catch {
      return [];
    }
  }
}
