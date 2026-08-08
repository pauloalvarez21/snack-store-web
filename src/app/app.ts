import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from './core/services/auth.service';
import { CartService } from './core/services/cart.service';
import { CartDrawer } from './features/cart/cart-drawer';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CartDrawer],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly cart = inject(CartService);
  protected readonly auth = inject(AuthService);

  constructor() {
    // Si hay un token guardado, recuperamos el perfil (o cerramos sesión si es inválido).
    if (this.auth.isAuthenticated() && !this.auth.user()) {
      this.auth.profile().subscribe({ error: () => this.auth.logout() });
    }
  }
}
