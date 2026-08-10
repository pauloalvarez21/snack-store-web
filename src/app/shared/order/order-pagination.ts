import { Component, computed, input, output } from '@angular/core';

/** Paginación numérica reutilizable (mismo patrón que el catálogo). */
@Component({
  selector: 'app-order-pagination',
  imports: [],
  templateUrl: './order-pagination.html',
  styleUrl: './order-pagination.scss'
})
export class OrderPagination {
  readonly page = input.required<number>();
  readonly totalPages = input.required<number>();
  readonly label = input('Paginación');

  readonly pageChange = output<number>();

  protected readonly pages = computed(() => {
    const current = this.page();
    const total = this.totalPages();
    const start = Math.max(1, Math.min(current - 2, total - 4));
    const end = Math.min(total, start + 4);
    const list: number[] = [];
    for (let p = start; p <= end; p++) list.push(p);
    return list;
  });

  protected goTo(page: number): void {
    if (page < 1 || page > this.totalPages() || page === this.page()) return;
    this.pageChange.emit(page);
  }
}
