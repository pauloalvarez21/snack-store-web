import { Component, inject } from '@angular/core';

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
  protected readonly formatPrice = formatPrice;
  protected readonly productEmoji = productEmoji;
}
