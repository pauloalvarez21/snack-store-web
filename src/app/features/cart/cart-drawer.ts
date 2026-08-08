import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';
import { formatPrice, productEmoji } from '../../core/utils/format';

@Component({
  selector: 'app-cart-drawer',
  imports: [],
  templateUrl: './cart-drawer.html',
  styleUrl: './cart-drawer.scss'
})
export class CartDrawer {
  protected readonly cart = inject(CartService);
  protected readonly auth = inject(AuthService);
  protected readonly formatPrice = formatPrice;
  protected readonly productEmoji = productEmoji;

  private readonly router = inject(Router);

  protected checkout(): void {
    this.cart.open.set(false);
    if (this.auth.isAuthenticated()) {
      this.router.navigate(['/checkout']);
    } else {
      this.router.navigate(['/auth'], { queryParams: { returnUrl: '/checkout' } });
    }
  }
}
