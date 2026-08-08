import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { of } from 'rxjs';
import { delay } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { Paginated } from '../models/paginated.model';
import { Category } from '../models/category.model';
import { Product } from '../models/product.model';
import { MOCK_CATEGORIES, MOCK_PRODUCTS } from '../mock/mock-data';

const LATENCY_MS = 350;

function paginate<T>(items: T[], page: number, limit: number): Paginated<T> {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * limit;
  return {
    data: items.slice(start, start + limit),
    meta: { page: safePage, limit, total, totalPages }
  };
}

/** Devuelve la categoría y todas sus descendientes (para filtrar por categoría padre). */
function categoryAndDescendants(categoryId: string): Set<string> {
  const set = new Set<string>();
  const collect = (id: string): void => {
    set.add(id);
    for (const child of MOCK_CATEGORIES) {
      if (child.parentId === id && !set.has(child.id)) collect(child.id);
    }
  };
  collect(categoryId);
  return set;
}

function withCategory(product: Product): Product {
  const category = MOCK_CATEGORIES.find((c) => c.id === product.categoryId);
  return category ? { ...product, category } : { ...product, category: undefined };
}

/**
 * Interceptor que simula la API REST durante el desarrollo (environment.useMockData).
 * Cuando el backend tenga datos reales, basta con poner useMockData: false.
 */
export const mockApiInterceptor: HttpInterceptorFn = (req, next) => {
  if (!environment.useMockData) {
    return next(req);
  }

  const url = req.url.replace(environment.apiUrl, '');

  if (req.method === 'GET' && url === '/api') {
    return of(new HttpResponse({ status: 200, body: 'Snack Store API — modo mock de desarrollo' })).pipe(
      delay(LATENCY_MS)
    );
  }

  if (req.method === 'GET' && url === '/api/categories') {
    const params = req.params;
    const parentId = params.get('parentId');
    const active = params.get('active');
    const page = Number(params.get('page') ?? 1);
    const limit = Number(params.get('limit') ?? 20);

    let list = [...MOCK_CATEGORIES];
    if (parentId) list = list.filter((c) => c.parentId === parentId);
    if (active === 'true') list = list.filter((c) => c.isActive);

    return of(new HttpResponse({ status: 200, body: paginate(list, page, limit) })).pipe(delay(LATENCY_MS));
  }

  const productDetail = url.match(/^\/api\/products\/([^/]+)$/);
  if (req.method === 'GET' && productDetail) {
    const product = MOCK_PRODUCTS.find((p) => p.id === productDetail[1]);
    if (product) {
      return of(new HttpResponse({ status: 200, body: withCategory(product) })).pipe(delay(LATENCY_MS));
    }
    return of(new HttpResponse({ status: 404, body: { message: 'Producto no encontrado' } })).pipe(delay(LATENCY_MS));
  }

  if (req.method === 'GET' && url === '/api/products') {
    const params = req.params;
    const search = (params.get('search') ?? '').trim().toLowerCase();
    const categoryId = params.get('categoryId');
    const active = params.get('active');
    const page = Number(params.get('page') ?? 1);
    const limit = Number(params.get('limit') ?? 12);

    let list = MOCK_PRODUCTS;
    if (active === 'true') list = list.filter((p) => p.isActive);
    if (categoryId) {
      const ids = categoryAndDescendants(categoryId);
      list = list.filter((p) => p.categoryId !== null && ids.has(p.categoryId));
    }
    if (search) {
      list = list.filter(
        (p) => p.name.toLowerCase().includes(search) || p.sku.toLowerCase().includes(search)
      );
    }
    list = list.map(withCategory);

    return of(new HttpResponse({ status: 200, body: paginate(list, page, limit) })).pipe(delay(LATENCY_MS));
  }

  return next(req);
};
