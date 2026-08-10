import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { AddressesPage } from './features/addresses/addresses-page';
import { AdminPage } from './features/admin/admin-page';
import { AuthPage } from './features/auth/auth-page';
import { CatalogPage } from './features/catalog/catalog-page';
import { CheckoutPage } from './features/checkout/checkout-page';
import { MyOrdersPage } from './features/my-orders/my-orders-page';
import { OrdersPage } from './features/orders/orders-page';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'catalogo' },
  { path: 'catalogo', component: CatalogPage },
  { path: 'auth', component: AuthPage },
  { path: 'checkout', component: CheckoutPage, canActivate: [authGuard] },
  { path: 'direcciones', component: AddressesPage, canActivate: [authGuard] },
  { path: 'mis-pedidos', component: MyOrdersPage, canActivate: [authGuard] },
  {
    path: 'pedidos',
    component: OrdersPage,
    canActivate: [authGuard, roleGuard(['ADMIN', 'DELIVERY'])]
  },
  {
    path: 'admin',
    component: AdminPage,
    canActivate: [authGuard, roleGuard(['ADMIN'])]
  },
  { path: '**', redirectTo: 'catalogo' }
];
