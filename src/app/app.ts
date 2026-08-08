import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

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
}
