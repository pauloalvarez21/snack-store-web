import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { catchError, map, of } from 'rxjs';

import { AuthService } from '../services/auth.service';

/**
 * Restringe una ruta a ciertos roles (p. ej. roleGuard(['ADMIN', 'DELIVERY'])).
 * Debe usarse junto a authGuard. Si el perfil aún no se ha cargado (reload con
 * token válido), espera a resolverlo antes de decidir, para no dejar pasar a
 * roles no permitidos.
 */
export function roleGuard(allowedRoles: readonly string[]): CanActivateFn {
  return (_route, state) => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (!auth.isAuthenticated()) {
      return router.createUrlTree(['/auth'], { queryParams: { returnUrl: state.url } });
    }

    const role = auth.user()?.role;
    if (role) {
      return allowedRoles.includes(role) || router.createUrlTree(['/catalogo']);
    }

    // Perfil aún no cargado: lo resolvemos antes de permitir o rechazar el acceso.
    return auth.profile().pipe(
      map((user) => allowedRoles.includes(user.role) || router.createUrlTree(['/catalogo'])),
      catchError(() => of(router.createUrlTree(['/catalogo'])))
    );
  };
}
