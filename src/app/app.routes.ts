import { Routes } from '@angular/router';

import { CatalogPage } from './features/catalog/catalog-page';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'catalogo' },
  { path: 'catalogo', component: CatalogPage },
  { path: '**', redirectTo: 'catalogo' }
];
