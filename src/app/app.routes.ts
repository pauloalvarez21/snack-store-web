import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';
import { AuthPage } from './features/auth/auth-page';
import { CatalogPage } from './features/catalog/catalog-page';
import { CheckoutPage } from './features/checkout/checkout-page';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'catalogo' },
  { path: 'catalogo', component: CatalogPage },
  { path: 'auth', component: AuthPage },
  { path: 'checkout', component: CheckoutPage, canActivate: [authGuard] },
  { path: '**', redirectTo: 'catalogo' }
];
