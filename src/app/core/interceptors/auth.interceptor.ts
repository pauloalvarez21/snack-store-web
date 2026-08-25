import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, finalize, map, of, share, switchMap, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

/** Marca las peticiones que ya se reintentaron tras un refresh (evita bucles). */
const RETRIED = new HttpContextToken<boolean>(() => false);

/** Endpoints de auth: un 401 ahí no se resuelve refrescando el token. */
const AUTH_ENDPOINTS = ['/api/auth/login', '/api/auth/register', '/api/auth/refresh', '/api/auth/logout'];

/** Refresco en curso, compartido entre peticiones simultáneas que reciben 401. */
let refreshChain: Observable<boolean> | null = null;

/**
 * Agrega el token JWT (Bearer) a las peticiones salientes y, ante un 401,
 * renueva la sesión con el refresh token y reintenta la petición original.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const token = auth.token();
  const outgoing = token
    ? req.clone({ withCredentials: true, setHeaders: { Authorization: `Bearer ${token}` } })
    : req.clone({ withCredentials: true });

  return next(outgoing).pipe(
    catchError((err: HttpErrorResponse) => {
      const canRefresh =
        err.status === 401 &&
        !req.context.get(RETRIED) &&
        !!auth.refreshToken() &&
        !isAuthEndpoint(req.url);
      if (!canRefresh) {
        return throwError(() => err);
      }
      return refreshSession(auth).pipe(
        switchMap((refreshed) => {
          if (!refreshed) {
            // Sin sesión renovable (refresh falló o no devolvió token).
            forceLogout(auth, router);
            return throwError(() => err);
          }
          // Reintenta la petición original con el token nuevo (solo una vez).
          return next(
            outgoing.clone({
              setHeaders: { Authorization: `Bearer ${auth.token() ?? ''}` },
              context: outgoing.context.set(RETRIED, true)
            })
          );
        })
      );
    })
  );
};

/** Renueva el token una sola vez, compartiendo la llamada entre 401 concurrentes. */
function refreshSession(auth: AuthService): Observable<boolean> {
  if (!refreshChain) {
    refreshChain = auth.refresh().pipe(
      map(() => !!auth.token()),
      catchError(() => of(false)),
      finalize(() => {
        refreshChain = null;
      }),
      share()
    );
  }
  return refreshChain;
}

/** La sesión no se puede renovar: cierra sesión y lleva al usuario al login. */
function forceLogout(auth: AuthService, router: Router): void {
  // Los tokens ya son inválidos: no tiene sentido revocarlos en el servidor.
  auth.logout(false);
  if (router.url.startsWith('/auth')) return;
  void router.navigate(['/auth'], { queryParams: { returnUrl: router.url } });
}

function isAuthEndpoint(url: string): boolean {
  const path = url.startsWith(environment.apiUrl) ? url.slice(environment.apiUrl.length) : url;
  return AUTH_ENDPOINTS.some((endpoint) => path.startsWith(endpoint));
}
