import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

import { Category } from '../../core/models/category.model';
import { Product } from '../../core/models/product.model';
import { CategoriesService } from '../../core/services/categories.service';
import { ProductsService } from '../../core/services/products.service';
import { categoryEmoji } from '../../core/utils/format';
import { ProductCard } from './product-card';

@Component({
  selector: 'app-catalog-page',
  imports: [ProductCard],
  templateUrl: './catalog-page.html',
  styleUrl: './catalog-page.scss'
})
export class CatalogPage {
  private readonly productsService = inject(ProductsService);
  private readonly categoriesService = inject(CategoriesService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly categories = signal<Category[]>([]);
  protected readonly products = signal<Product[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal(false);

  protected readonly page = signal(1);
  protected readonly limit = signal(12);
  protected readonly total = signal(0);
  protected readonly search = signal('');
  protected readonly categoryId = signal<string | null>(null);
  protected readonly selectedParent = signal<string | null>(null);

  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.limit())));
  protected readonly hasFilters = computed(() => !!this.search() || !!this.categoryId());
  protected readonly activeCategoryName = computed(() => {
    const id = this.categoryId();
    return id ? (this.categories().find((c) => c.id === id)?.name ?? null) : null;
  });
  protected readonly pageList = computed(() => {
    const current = this.page();
    const last = this.totalPages();
    const start = Math.max(1, Math.min(current - 2, last - 4));
    const end = Math.min(last, start + 4);
    const list: number[] = [];
    for (let p = start; p <= end; p++) list.push(p);
    return list;
  });
  protected readonly skeleton = Array.from({ length: 8 });

  private readonly search$ = new Subject<string>();

  constructor() {
    this.loadCategories();
    this.loadProducts();

    const subscription = this.search$.pipe(debounceTime(300)).subscribe((value) => {
      this.search.set(value.trim());
      this.page.set(1);
      this.loadProducts();
    });
    this.destroyRef.onDestroy(() => subscription.unsubscribe());
  }

  protected onSearchInput(event: Event): void {
    this.search$.next((event.target as HTMLInputElement).value);
  }

  protected toggleParent(parentId: string | null): void {
    this.selectedParent.set(this.selectedParent() === parentId ? null : parentId);
  }

  protected onParentClick(id: string): void {
    this.toggleParent(id);
    this.selectCategory(id);
  }

  protected selectCategory(id: string | null): void {
    this.categoryId.set(id);
    this.page.set(1);
    this.loadProducts();
  }

  protected clearFilters(): void {
    this.search.set('');
    this.categoryId.set(null);
    this.selectedParent.set(null);
    this.page.set(1);
    this.loadProducts();
  }

  protected goToPage(page: number): void {
    if (page < 1 || page > this.totalPages() || page === this.page()) return;
    this.page.set(page);
    this.loadProducts();
  }

  protected hasChildren(id: string): boolean {
    return this.categories().some((c) => c.parentId === id);
  }

  protected childrenOf(id: string): Category[] {
    return this.categories().filter((c) => c.parentId === id);
  }

  protected categoryEmoji(name: string): string {
    return categoryEmoji(name);
  }

  protected loadProducts(): void {
    this.loading.set(true);
    this.error.set(false);
    this.productsService
      .findAll({
        page: this.page(),
        limit: this.limit(),
        search: this.search() || undefined,
        categoryId: this.categoryId(),
        active: true
      })
      .subscribe({
        next: (res) => {
          this.products.set(res.data);
          this.total.set(res.meta.total);
          this.page.set(res.meta.page);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.error.set(true);
        }
      });
  }

  private loadCategories(): void {
    this.categoriesService.findAll({ limit: 100, active: true }).subscribe({
      next: (res) => this.categories.set(res.data),
      error: () => this.categories.set([])
    });
  }
}
