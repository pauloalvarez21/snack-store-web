import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Paginated } from '../models/paginated.model';
import { Category, CreateCategoryDto, UpdateCategoryDto } from '../models/category.model';

export interface CategoryQuery {
  page?: number;
  limit?: number;
  parentId?: string | null;
  active?: boolean;
}

@Injectable({ providedIn: 'root' })
export class CategoriesService {
  private readonly http = inject(HttpClient);

  findAll(query: CategoryQuery = {}): Observable<Paginated<Category>> {
    let params = new HttpParams();
    if (query.page) params = params.set('page', String(query.page));
    if (query.limit) params = params.set('limit', String(query.limit));
    if (query.parentId) params = params.set('parentId', query.parentId);
    if (query.active !== undefined) params = params.set('active', String(query.active));
    return this.http.get<Paginated<Category>>(`${environment.apiUrl}/api/categories`, { params });
  }

  findOne(id: string): Observable<Category> {
    return this.http.get<Category>(`${environment.apiUrl}/api/categories/${id}`);
  }

  create(dto: CreateCategoryDto): Observable<Category> {
    return this.http.post<Category>(`${environment.apiUrl}/api/categories`, dto);
  }

  update(id: string, dto: UpdateCategoryDto): Observable<Category> {
    return this.http.patch<Category>(`${environment.apiUrl}/api/categories/${id}`, dto);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/api/categories/${id}`);
  }
}
