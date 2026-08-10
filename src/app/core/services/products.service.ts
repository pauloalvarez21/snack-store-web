import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Paginated } from '../models/paginated.model';
import { Product, CreateProductDto, UpdateProductDto } from '../models/product.model';

export interface ProductQuery {
  page?: number;
  limit?: number;
  categoryId?: string | null;
  active?: boolean;
  search?: string;
}

@Injectable({ providedIn: 'root' })
export class ProductsService {
  private readonly http = inject(HttpClient);

  findAll(query: ProductQuery = {}): Observable<Paginated<Product>> {
    let params = new HttpParams();
    if (query.page) params = params.set('page', String(query.page));
    if (query.limit) params = params.set('limit', String(query.limit));
    if (query.categoryId) params = params.set('categoryId', query.categoryId);
    if (query.search) params = params.set('search', query.search);
    if (query.active !== undefined) params = params.set('active', String(query.active));
    return this.http.get<Paginated<Product>>(`${environment.apiUrl}/api/products`, { params });
  }

  findOne(id: string): Observable<Product> {
    return this.http.get<Product>(`${environment.apiUrl}/api/products/${id}`);
  }

  create(dto: CreateProductDto): Observable<Product> {
    return this.http.post<Product>(`${environment.apiUrl}/api/products`, dto);
  }

  update(id: string, dto: UpdateProductDto): Observable<Product> {
    return this.http.patch<Product>(`${environment.apiUrl}/api/products/${id}`, dto);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/api/products/${id}`);
  }

  /** Sube una imagen y devuelve la URL pública (solo ADMIN). */
  uploadImage(file: File): Observable<{ imageUrl: string }> {
    const form = new FormData();
    form.append('image', file, file.name);
    return this.http.post<{ imageUrl: string }>(`${environment.apiUrl}/api/uploads/images`, form);
  }
}
