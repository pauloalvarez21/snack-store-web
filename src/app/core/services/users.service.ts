import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Paginated } from '../models/paginated.model';
import {
  ChangePasswordRequest,
  UpdateProfileRequest,
  UpdateUserRoleRequest,
  User,
  UserRole
} from '../models/user.model';

export interface UserQuery {
  page?: number;
  limit?: number;
  role?: UserRole | null;
  search?: string;
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly http = inject(HttpClient);

  /** Mi perfil completo (usuario autenticado). */
  findMe(): Observable<User> {
    return this.http.get<User>(`${environment.apiUrl}/api/users/me`);
  }

  /** Actualiza mi perfil (nombre, apellido, teléfono). Enviar phone: null para limpiarlo. */
  updateMe(dto: UpdateProfileRequest): Observable<User> {
    return this.http.patch<User>(`${environment.apiUrl}/api/users/me`, dto);
  }

  /** Cambia mi contraseña (usuario autenticado). */
  changePassword(dto: ChangePasswordRequest): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/api/users/me/change-password`, dto);
  }

  /** Lista de usuarios paginada, con filtro por rol y búsqueda (solo ADMIN). */
  findAll(query: UserQuery = {}): Observable<Paginated<User>> {
    let params = new HttpParams();
    if (query.page) params = params.set('page', String(query.page));
    if (query.limit) params = params.set('limit', String(query.limit));
    if (query.role) params = params.set('role', query.role);
    if (query.search) params = params.set('search', query.search);
    return this.http.get<Paginated<User>>(`${environment.apiUrl}/api/users`, { params });
  }

  /** Detalle de un usuario (solo ADMIN). */
  findOne(id: string): Observable<User> {
    return this.http.get<User>(`${environment.apiUrl}/api/users/${id}`);
  }

  /** Cambia el rol de un usuario (solo ADMIN). */
  updateRole(id: string, dto: UpdateUserRoleRequest): Observable<User> {
    return this.http.patch<User>(`${environment.apiUrl}/api/users/${id}/role`, dto);
  }
}
