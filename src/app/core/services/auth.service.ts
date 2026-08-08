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
  readonly user = signal<AuthUser | null>(null);
  readonly isAuthenticated = computed(() => !!this.token());

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${environment.apiUrl}/api/auth/login`, credentials).pipe(
      tap((res) => {
        if (this.captureToken(res)) {
          if (res.user) {
            this.user.set(res.user);
          } else {
            this.refreshProfile();
          }
        }
      })
    );
  }

  register(payload: RegisterRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${environment.apiUrl}/api/auth/register`, payload).pipe(
      tap((res) => {
        // El backend real autentica al registrar; el mock también. Si no viniera
        // token, la UI hace login explícito después.
        if (this.captureToken(res) && res.user) {
          this.user.set(res.user);
        }
      })
    );
  }

  profile(): Observable<AuthUser> {
    return this.http.get<AuthUser>(`${environment.apiUrl}/api/auth/profile`).pipe(
      tap((user) => this.user.set(user))
    );
  }

  logout(): void {
    localStorage.removeItem(AuthService.TOKEN_KEY);
    this.token.set(null);
    this.user.set(null);
  }

  /** Extrae el token del cuerpo (soporta access_token, accessToken o token) y lo guarda. */
  private captureToken(res: LoginResponse): boolean {
    const accessToken = res.access_token ?? res.accessToken ?? res.token ?? '';
    if (!accessToken) return false;
    this.setToken(accessToken);
    return true;
  }

  private refreshProfile(): void {
    this.profile().subscribe({ error: () => undefined });
  }

  private setToken(token: string): void {
    localStorage.setItem(AuthService.TOKEN_KEY, token);
    this.token.set(token);
  }
}
