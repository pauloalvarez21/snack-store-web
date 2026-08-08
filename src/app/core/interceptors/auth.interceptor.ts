import { HttpInterceptorFn } from '@angular/common/http';

const TOKEN_KEY = 'snack_store_token';

/** Agrega el token JWT (Bearer) a las peticiones salientes si existe. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    const cloned = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
    return next(cloned);
  }
  return next(req);
};
