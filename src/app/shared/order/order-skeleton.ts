import { Component, computed, input } from '@angular/core';

/** Tarjetas de carga simuladas mientras se obtienen los pedidos. */
@Component({
  selector: 'app-order-skeleton',
  imports: [],
  templateUrl: './order-skeleton.html',
  styleUrl: './order-skeleton.scss'
})
export class OrderSkeleton {
  readonly count = input(4);

  protected readonly items = computed(() => Array.from({ length: this.count() }));
}
