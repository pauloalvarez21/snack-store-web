import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { EMPTY, Observable, Subject, catchError, concatMap, defaultIfEmpty, from, map, of, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Product } from '../models/product.model';
import { CartItemResponse, CartProductInfo, CartResponse } from '../models/cart.model';

export interface CartItem {
  product: Product;
  quantity: number;
}

/**
 * Carrito del cliente respaldado por el API (`/api/carts/me`).
 * Requiere sesión iniciada: los invitados no tienen carrito (la UI los lleva a login).
 */
@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly http = inject(HttpClient);

  private readonly _items = signal<CartItem[]>([]);
  readonly items = this._items.asReadonly();

  readonly count = computed(() => this._items().reduce((acc, item) => acc + item.quantity, 0));
  readonly total = computed(() =>
    this._items().reduce((acc, item) => acc + item.quantity * (item.product.salePrice ?? item.product.price), 0)
  );

  readonly open = signal(false);

  /**
   * Cola de cambios de cantidad: el API fija la cantidad absoluta (PATCH), así que
   * serializamos las operaciones para que cada una calcule su delta sobre el estado
   * ya aplicado y los clics rápidos del stepper no pierdan actualizaciones.
   */
  private readonly quantityOps$ = new Subject<{ id: string; delta: number }>();

  constructor() {
    this.quantityOps$.pipe(concatMap((op) => this.runQuantityOp(op.id, op.delta))).subscribe();
  }

  /** Recarga el carrito desde el servidor (p. ej. tras iniciar sesión). */
  refresh(): void {
    this.http.get<CartResponse>(`${environment.apiUrl}/api/carts/me`).subscribe({
      next: (cart) => this.apply(cart),
      error: () => this._items.set([])
    });
  }

  /** Agrega un producto (cantidad 1). Requiere sesión. */
  add(product: Product): void {
    this.http
      .post<CartResponse>(`${environment.apiUrl}/api/carts/me/items`, {
        productId: product.id,
        quantity: 1
      })
      .pipe(
        tap((cart) => {
          this.apply(cart);
          this.open.set(true);
        }),
        catchError((err) => this.handleError(err))
      )
      .subscribe();
  }

  /**
   * Re-agrega productos con sus cantidades ("comprar de nuevo").
   * Las peticiones se serializan con concatMap y se salta cualquier producto
   * que ya no exista o no tenga stock. Emite la cantidad de productos que
   * se agregaron con éxito (0 si ninguno), para que la UI dé feedback.
   */
  reorder(items: { productId: string; quantity: number }[]): Observable<number> {
    let added = 0;
    return from(items).pipe(
      concatMap((item) =>
        this.http
          .post<CartResponse>(`${environment.apiUrl}/api/carts/me/items`, {
            productId: item.productId,
            quantity: item.quantity
          })
          .pipe(
            tap((cart) => {
              this.apply(cart);
              added++;
            }),
            catchError((err) => this.handleError(err))
          )
      ),
      defaultIfEmpty(0),
      map(() => added)
    );
  }

  increase(id: string): void {
    this.quantityOps$.next({ id, delta: 1 });
  }

  decrease(id: string): void {
    this.quantityOps$.next({ id, delta: -1 });
  }

  remove(id: string): void {
    this.http
      .delete<void>(`${environment.apiUrl}/api/carts/me/items/${id}`)
      .pipe(
        tap(() => this._items.update((items) => items.filter((item) => item.product.id !== id))),
        catchError((err) => this.handleError(err))
      )
      .subscribe();
  }

  /** Vacía el carrito en el servidor. */
  clear(): void {
    this.http
      .delete<void>(`${environment.apiUrl}/api/carts/me`)
      .pipe(
        tap(() => this._items.set([])),
        catchError((err) => this.handleError(err))
      )
      .subscribe();
  }

  /** Limpia el estado local sin llamar al servidor (logout, pedido creado). */
  reset(): void {
    this._items.set([]);
  }

  /** Calcula y aplica el cambio de cantidad; si baja de 1, elimina el ítem. */
  private runQuantityOp(id: string, delta: number): Observable<unknown> {
    const item = this._items().find((i) => i.product.id === id);
    if (!item) return of(undefined);
    const next = item.quantity + delta;
    if (next < 1) {
      return this.http.delete<void>(`${environment.apiUrl}/api/carts/me/items/${id}`).pipe(
        tap(() => this._items.update((items) => items.filter((i) => i.product.id !== id))),
        catchError((err) => this.handleError(err))
      );
    }
    return this.http
      .patch<CartResponse>(`${environment.apiUrl}/api/carts/me/items/${id}`, { quantity: next })
      .pipe(
        tap((cart) => this.apply(cart)),
        catchError((err) => this.handleError(err))
      );
  }

  private handleError(err: unknown): Observable<never> {
    if ((err as { status?: number }).status === 401) {
      // Sesión expirada: el carrito del servidor ya no es accesible.
      this._items.set([]);
    }
    console.error('Operación de carrito falló', err);
    return EMPTY;
  }

  private apply(cart: CartResponse): void {
    this._items.set(
      cart.items
        .filter((item): item is CartItemResponse & { product: CartProductInfo } => item.product !== null)
        .map((item) => ({ product: this.toProduct(item.product), quantity: item.quantity }))
    );
  }

  /** Mapea el producto ligero del carrito al modelo Product que usa la UI. */
  private toProduct(info: CartProductInfo): Product {
    return {
      id: info.id,
      categoryId: null,
      sku: info.sku,
      name: info.name,
      slug: info.slug,
      description: null,
      price: info.price,
      salePrice: info.salePrice,
      unit: info.unit,
      isPerishable: false,
      isOrganic: false,
      imageUrl: info.imageUrl,
      isActive: true,
      inStock: info.inStock,
      stockStatus: info.stockStatus
    };
  }
}
