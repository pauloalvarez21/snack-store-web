import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthUser, LoginRequest, LoginResponse, RegisterRequest } from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private static readonly TOKEN_KEY = 'snack_store_token';

  private readonly http = inject(HttpClient);

  readonly token = signal<string | null>(localStorage.getItem(AuthService.TOKEN_KEY));
  readonly isAuthenticated = computed(() => !!this.token());

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${environment.apiUrl}/api/auth/login`, credentials).pipe(
      tap((res) => {
        const accessToken = res.accessToken ?? res.token ?? '';
        if (accessToken) this.setToken(accessToken);
      })
    );
  }

  register(payload: RegisterRequest): Observable<unknown> {
    return this.http.post(`${environment.apiUrl}/api/auth/register`, payload);
  }

  profile(): Observable<AuthUser> {
    return this.http.get<AuthUser>(`${environment.apiUrl}/api/auth/profile`);
  }

  logout(): void {
    localStorage.removeItem(AuthService.TOKEN_KEY);
    this.token.set(null);
  }

  private setToken(token: string): void {
    localStorage.setItem(AuthService.TOKEN_KEY, token);
    this.token.set(token);
  }
}
