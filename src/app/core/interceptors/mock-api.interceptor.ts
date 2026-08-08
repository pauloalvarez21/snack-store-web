import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { Paginated } from '../models/paginated.model';
import { AuthUser } from '../models/auth.model';
import { MOCK_CATEGORIES, MOCK_PRODUCTS } from '../mock/mock-data';

const LATENCY_MS = 350;

interface MockUser extends AuthUser {
  password: string;
}

const DEMO_USER: MockUser = {
  id: 'usr-demo-0001',
  email: 'demo@snackstore.local',
  password: 'Demo12345!',
  firstName: 'Demo',
  lastName: 'User',
  phone: '+56912345678',
  role: 'CUSTOMER'
};

let mockUsers: MockUser[] = [DEMO_USER];

function publicUser(user: MockUser): AuthUser {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    role: user.role
  };
}

function createMockToken(email: string): string {
  return `mock-token.${btoa(email)}.${Date.now()}`;
}

function emailFromToken(authorization: string | null): string | null {
  if (!authorization?.startsWith('Bearer ')) return null;
  const payload = authorization.replace('Bearer ', '').split('.')[1];
  try {
    return payload ? atob(payload) : null;
  } catch {
    return null;
  }
}

function paginate<T>(items: T[], page: number, limit: number): Paginated<T> {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * limit;
  return {
    data: items.slice(start, start + limit),
    total,
    page: safePage,
    limit,
    totalPages
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

function withCategory(product: (typeof MOCK_PRODUCTS)[number]): (typeof MOCK_PRODUCTS)[number] {
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

  // ===== Auth (mock) =====
  if (req.method === 'POST' && url === '/api/auth/register') {
    const body = req.body as { email?: string; password?: string; firstName?: string; lastName?: string; phone?: string };
    const email = body?.email?.toLowerCase().trim() ?? '';
    if (!email || !body?.password || !body?.firstName || !body?.lastName) {
      return throwError(() => new HttpErrorResponse({ status: 400, statusText: 'Bad Request', url: req.url, error: { message: 'Faltan campos obligatorios' } })).pipe(delay(LATENCY_MS));
    }
    if (mockUsers.some((u) => u.email === email)) {
      return throwError(() => new HttpErrorResponse({ status: 409, statusText: 'Conflict', url: req.url, error: { message: 'El email ya está registrado' } })).pipe(delay(LATENCY_MS));
    }
    const user: MockUser = {
      id: `usr-${Date.now().toString(36)}`,
      email,
      password: body.password,
      firstName: body.firstName.trim(),
      lastName: body.lastName.trim(),
      phone: body.phone?.trim() || undefined,
      role: 'CUSTOMER'
    };
    mockUsers = [...mockUsers, user];
    return of(new HttpResponse({ status: 201, body: publicUser(user) })).pipe(delay(LATENCY_MS));
  }

  if (req.method === 'POST' && url === '/api/auth/login') {
    const body = req.body as { email?: string; password?: string };
    const email = body?.email?.toLowerCase().trim() ?? '';
    const user = mockUsers.find((u) => u.email === email && u.password === body?.password);
    if (!user) {
      return throwError(() => new HttpErrorResponse({ status: 401, statusText: 'Unauthorized', url: req.url, error: { message: 'Credenciales inválidas' } })).pipe(delay(LATENCY_MS));
    }
    return of(
      new HttpResponse({ status: 200, body: { accessToken: createMockToken(email), user: publicUser(user) } })
    ).pipe(delay(LATENCY_MS));
  }

  if (req.method === 'GET' && url === '/api/auth/profile') {
    const email = emailFromToken(req.headers.get('Authorization'));
    const user = email ? mockUsers.find((u) => u.email === email) : undefined;
    if (!user) {
      return throwError(() => new HttpErrorResponse({ status: 401, statusText: 'Unauthorized', url: req.url, error: { message: 'No autorizado' } })).pipe(delay(LATENCY_MS));
    }
    return of(new HttpResponse({ status: 200, body: publicUser(user) })).pipe(delay(LATENCY_MS));
  }

  // ===== Categories =====
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

  // ===== Products =====
  const productDetail = url.match(/^\/api\/products\/([^/]+)$/);
  if (req.method === 'GET' && productDetail) {
    const product = MOCK_PRODUCTS.find((p) => p.id === productDetail[1]);
    if (product) {
      return of(new HttpResponse({ status: 200, body: withCategory(product) })).pipe(delay(LATENCY_MS));
    }
    return throwError(() => new HttpErrorResponse({ status: 404, statusText: 'Not Found', url: req.url, error: { message: 'Producto no encontrado' } })).pipe(delay(LATENCY_MS));
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
