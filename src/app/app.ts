import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from './core/services/auth.service';
import { CartService } from './core/services/cart.service';
import { ThemeService } from './core/services/theme.service';
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
  protected readonly theme = inject(ThemeService);

  protected readonly userName = computed(() => {
    const user = this.auth.user();
    if (!user) return '';
    const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
    return name || 'Usuario';
  });

  constructor() {
    // Si hay un token guardado, recuperamos el perfil (o cerramos sesión si es inválido).
    if (this.auth.isAuthenticated() && !this.auth.user()) {
      this.auth.profile().subscribe({ error: () => this.auth.logout() });
    }
  }
}
