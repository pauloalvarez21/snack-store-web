import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  AuthUser,
  LoginRequest,
  LoginResponse,
  LogoutRequest,
  RefreshRequest,
  RefreshResponse,
  RegisterRequest
} from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private static readonly TOKEN_KEY = 'snack_store_token';
  private static readonly REFRESH_TOKEN_KEY = 'snack_store_refresh_token';

  private readonly http = inject(HttpClient);

  readonly token = signal<string | null>(localStorage.getItem(AuthService.TOKEN_KEY));
  readonly refreshToken = signal<string | null>(localStorage.getItem(AuthService.REFRESH_TOKEN_KEY));
  readonly user = signal<AuthUser | null>(null);
  readonly isAuthenticated = computed(() => !!this.token());

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${environment.apiUrl}/api/auth/login`, credentials).pipe(
      tap((res) => {
        if (this.captureTokens(res)) {
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
        // El backend autentica al registrar. Si no viniera token,
        // la UI hace login explícito después.
        if (this.captureTokens(res) && res.user) {
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

  /** Renueva el access token con el refresh token guardado (rotación de tokens). */
  refresh(): Observable<RefreshResponse> {
    const refreshToken = this.refreshToken();
    if (!refreshToken) {
      return throwError(() => new Error('No hay refresh token disponible'));
    }
    const body: RefreshRequest = { refreshToken };
    return this.http
      .post<RefreshResponse>(`${environment.apiUrl}/api/auth/refresh`, body)
      .pipe(
        tap((res) => {
          if (this.captureTokens(res) && res.user) {
            this.user.set(res.user);
          }
        })
      );
  }

  /**
   * Cierra la sesión local y revoca los tokens en el servidor (sin bloquear la UI).
   * Pasa `false` cuando los tokens ya son inválidos (p. ej. un refresh fallido).
   */
  logout(revokeOnServer = true): void {
    const refreshToken = this.refreshToken();
    localStorage.removeItem(AuthService.TOKEN_KEY);
    localStorage.removeItem(AuthService.REFRESH_TOKEN_KEY);
    this.token.set(null);
    this.refreshToken.set(null);
    this.user.set(null);

    if (refreshToken && revokeOnServer) {
      const body: LogoutRequest = { refreshToken };
      this.http
        .post<void>(`${environment.apiUrl}/api/auth/logout`, body)
        .subscribe({ error: () => undefined });
    }
  }

  /** Extrae el access token del cuerpo (soporta access_token, accessToken o token) y lo guarda. */
  private captureTokens(res: LoginResponse | RefreshResponse): boolean {
    const accessToken = res.access_token ?? res.accessToken ?? res.token ?? '';
    if (!accessToken) return false;
    this.setToken(accessToken);
    const refreshToken = res.refresh_token ?? res.refreshToken;
    if (refreshToken) {
      this.setRefreshToken(refreshToken);
    }
    return true;
  }

  private refreshProfile(): void {
    this.profile().subscribe({ error: () => undefined });
  }

  private setToken(token: string): void {
    localStorage.setItem(AuthService.TOKEN_KEY, token);
    this.token.set(token);
  }

  private setRefreshToken(token: string): void {
    localStorage.setItem(AuthService.REFRESH_TOKEN_KEY, token);
    this.refreshToken.set(token);
  }
}
