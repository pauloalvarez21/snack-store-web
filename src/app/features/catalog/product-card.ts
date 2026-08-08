import { Component, computed, inject, input } from '@angular/core';

import { Product } from '../../core/models/product.model';
import { CartService } from '../../core/services/cart.service';
import { formatPrice, productEmoji } from '../../core/utils/format';

@Component({
  selector: 'app-product-card',
  imports: [],
  templateUrl: './product-card.html',
  styleUrl: './product-card.scss'
})
export class ProductCard {
  readonly product = input.required<Product>();

  private readonly cart = inject(CartService);

  protected readonly emoji = computed(() => productEmoji(this.product()));
  protected readonly discount = computed(() => {
    const p = this.product();
    if (!p.salePrice || p.salePrice >= p.price) return null;
    return Math.round((1 - p.salePrice / p.price) * 100);
  });
  protected readonly price = computed(() => formatPrice(this.product().salePrice ?? this.product().price));
  protected readonly oldPrice = computed(() =>
    this.product().salePrice ? formatPrice(this.product().price) : null
  );

  protected addToCart(): void {
    this.cart.add(this.product());
  }
}
