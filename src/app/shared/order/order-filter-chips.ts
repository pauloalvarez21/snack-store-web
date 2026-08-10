import { Component, input, output } from '@angular/core';

export interface OrderFilterOption {
  value: string;
  label: string;
}

/** Fila de chips para filtrar listas (p. ej. pedidos por estado). */
@Component({
  selector: 'app-order-filter-chips',
  imports: [],
  templateUrl: './order-filter-chips.html',
  styleUrl: './order-filter-chips.scss'
})
export class OrderFilterChips {
  readonly options = input.required<OrderFilterOption[]>();
  readonly active = input.required<string>();
  readonly label = input('Filtrar');

  readonly select = output<string>();

  protected pick(value: string): void {
    if (value === this.active()) return;
    this.select.emit(value);
  }
}
