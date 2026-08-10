import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Paginated } from '../models/paginated.model';
import { AdjustInventoryDto, InventoryItem, UpdateInventoryDto } from '../models/inventory.model';

export interface InventoryQuery {
  page?: number;
  limit?: number;
  search?: string;
}

@Injectable({ providedIn: 'root' })
export class InventoryService {
  private readonly http = inject(HttpClient);

  /** Lista de inventario con producto (paginado, solo ADMIN). */
  findAll(query: InventoryQuery = {}): Observable<Paginated<InventoryItem>> {
    let params = new HttpParams();
    if (query.page) params = params.set('page', String(query.page));
    if (query.limit) params = params.set('limit', String(query.limit));
    if (query.search) params = params.set('search', query.search);
    return this.http.get<Paginated<InventoryItem>>(`${environment.apiUrl}/api/inventory`, { params });
  }

  findOne(productId: string): Observable<InventoryItem> {
    return this.http.get<InventoryItem>(`${environment.apiUrl}/api/inventory/${productId}`);
  }

  /** Fija stock, mínimo y/o vencimiento (crea el registro si no existe). */
  update(productId: string, dto: UpdateInventoryDto): Observable<InventoryItem> {
    return this.http.patch<InventoryItem>(`${environment.apiUrl}/api/inventory/${productId}`, dto);
  }

  /** Ajusta el stock por delta (suma o resta; no puede quedar negativo). */
  adjust(productId: string, quantity: number): Observable<InventoryItem> {
    const dto: AdjustInventoryDto = { quantity };
    return this.http.post<InventoryItem>(`${environment.apiUrl}/api/inventory/${productId}/adjust`, dto);
  }
}
