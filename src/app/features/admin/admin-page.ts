import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, finalize } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

import { Category, CreateCategoryDto, UpdateCategoryDto } from '../../core/models/category.model';
import {
  InventoryItem,
  STOCK_STATUS_LABEL,
  StockStatus,
  UpdateInventoryDto
} from '../../core/models/inventory.model';
import { CreateProductDto, Product, UpdateProductDto } from '../../core/models/product.model';
import { User, UserRole } from '../../core/models/user.model';
import { AuthService } from '../../core/services/auth.service';
import { CategoriesService } from '../../core/services/categories.service';
import { InventoryService } from '../../core/services/inventory.service';
import { ProductsService } from '../../core/services/products.service';
import { UsersService } from '../../core/services/users.service';
import { USER_ROLES, formatDateTime, formatPrice, productEmoji, userRoleLabel } from '../../core/utils/format';
import { OrderPagination } from '../../shared/order/order-pagination';
import { OrderSkeleton } from '../../shared/order/order-skeleton';

type AdminTab = 'products' | 'categories' | 'inventory' | 'users';

const STOCK_CLASS: Record<StockStatus, string> = {
  IN_STOCK: 'st-in',
  LOW_STOCK: 'st-low',
  OUT_OF_STOCK: 'st-out'
};

const ROLE_CLASS: Record<UserRole, string> = {
  CUSTOMER: 'role-customer',
  ADMIN: 'role-admin',
  DELIVERY: 'role-delivery'
};

@Component({
  selector: 'app-admin-page',
  imports: [ReactiveFormsModule, OrderPagination, OrderSkeleton],
  templateUrl: './admin-page.html',
  styleUrl: './admin-page.scss'
})
export class AdminPage {
  private readonly productsService = inject(ProductsService);
  private readonly categoriesService = inject(CategoriesService);
  private readonly inventoryService = inject(InventoryService);
  private readonly usersService = inject(UsersService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly tab = signal<AdminTab>('products');

  // ===== Búsquedas (debounce manual con input nativo) =====
  protected readonly productSearch = signal('');
  protected readonly inventorySearch = signal('');
  protected readonly usersSearch = signal('');

  // ===== Productos =====
  protected readonly products = signal<Product[]>([]);
  protected readonly productsPage = signal(1);
  protected readonly productsTotal = signal(0);
  protected readonly productsLoading = signal(true);
  protected readonly productsError = signal(false);
  protected readonly productsErrorMsg = signal('');
  protected readonly productFormOpen = signal(false);
  protected readonly productEditingId = signal<string | null>(null);
  protected readonly productBusy = signal(false);
  protected readonly productFeedback = signal<{ type: 'error' | 'success'; message: string } | null>(null);
  protected readonly uploadingImage = signal(false);

  protected readonly productsTotalPages = computed(() =>
    Math.max(1, Math.ceil(this.productsTotal() / 20))
  );

  protected readonly productForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.maxLength(200)]),
    sku: new FormControl('', [Validators.required, Validators.maxLength(50)]),
    categoryId: new FormControl<string | null>(null),
    price: new FormControl<number | null>(null, [Validators.required, Validators.min(0)]),
    salePrice: new FormControl<number | null>(null, [Validators.min(0)]),
    unit: new FormControl('', [Validators.required, Validators.maxLength(20)]),
    description: new FormControl(''),
    imageUrl: new FormControl(''),
    isPerishable: new FormControl(false),
    isOrganic: new FormControl(false),
    isActive: new FormControl(true)
  });

  // ===== Categorías =====
  protected readonly categories = signal<Category[]>([]);
  protected readonly categoriesPage = signal(1);
  protected readonly categoriesTotal = signal(0);
  protected readonly categoriesLoading = signal(true);
  protected readonly categoriesError = signal(false);
  protected readonly categoriesErrorMsg = signal('');
  protected readonly categoryFormOpen = signal(false);
  protected readonly categoryEditingId = signal<string | null>(null);
  protected readonly categoryBusy = signal(false);
  protected readonly categoryFeedback = signal<{ type: 'error' | 'success'; message: string } | null>(null);

  /** Todas las categorías activas (para selects de padre/categoría de producto). */
  protected readonly allCategories = signal<Category[]>([]);

  protected readonly categoriesTotalPages = computed(() =>
    Math.max(1, Math.ceil(this.categoriesTotal() / 20))
  );

  protected readonly categoryForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.maxLength(100)]),
    description: new FormControl(''),
    parentId: new FormControl<string | null>(null),
    isActive: new FormControl(true)
  });

  // ===== Inventario =====
  protected readonly inventory = signal<InventoryItem[]>([]);
  protected readonly inventoryPage = signal(1);
  protected readonly inventoryTotal = signal(0);
  protected readonly inventoryLoading = signal(true);
  protected readonly inventoryError = signal(false);
  protected readonly inventoryErrorMsg = signal('');
  protected readonly inventoryEditingId = signal<string | null>(null);
  protected readonly inventoryBusy = signal(false);
  protected readonly inventoryFeedback = signal<{ type: 'error' | 'success'; message: string } | null>(null);

  protected readonly inventoryTotalPages = computed(() =>
    Math.max(1, Math.ceil(this.inventoryTotal() / 20))
  );

  protected readonly inventoryForm = new FormGroup({
    stockQuantity: new FormControl<number | null>(null, [Validators.min(0)]),
    minStockLevel: new FormControl<number | null>(null, [Validators.min(0)]),
    expirationDate: new FormControl('')
  });

  /** Formulario del ajuste rápido de stock (formGroup propio para que (ngSubmit) funcione). */
  protected readonly adjustForm = new FormGroup({
    quantity: new FormControl<number | null>(null)
  });

  // ===== Usuarios =====
  protected readonly users = signal<User[]>([]);
  protected readonly usersPage = signal(1);
  protected readonly usersTotal = signal(0);
  protected readonly usersLoading = signal(true);
  protected readonly usersError = signal(false);
  protected readonly usersErrorMsg = signal('');
  protected readonly usersRoleFilter = signal<UserRole | null>(null);
  protected readonly usersFeedback = signal<{ type: 'error' | 'success'; message: string } | null>(null);
  protected readonly roleUpdatingId = signal<string | null>(null);

  protected readonly usersTotalPages = computed(() =>
    Math.max(1, Math.ceil(this.usersTotal() / 20))
  );

  protected readonly userRoles = USER_ROLES;
  protected readonly userRoleLabel = userRoleLabel;

  protected readonly formatPrice = formatPrice;
  protected readonly formatDateTime = formatDateTime;
  protected readonly productEmoji = productEmoji;
  protected readonly stockStatusLabel = STOCK_STATUS_LABEL;
  protected readonly stockClass = (s: StockStatus): string => STOCK_CLASS[s];

  private readonly productSearch$ = new Subject<string>();
  private readonly inventorySearch$ = new Subject<string>();
  private readonly usersSearch$ = new Subject<string>();

  constructor() {
    this.loadProducts();
    this.loadCategories();
    this.loadAllCategories();
    this.loadInventory();
    this.loadUsers();

    const productSub = this.productSearch$.pipe(debounceTime(300)).subscribe((value) => {
      this.productSearch.set(value.trim());
      this.productsPage.set(1);
      this.loadProducts();
    });
    const inventorySub = this.inventorySearch$.pipe(debounceTime(300)).subscribe((value) => {
      this.inventorySearch.set(value.trim());
      this.inventoryPage.set(1);
      this.loadInventory();
    });
    const usersSub = this.usersSearch$.pipe(debounceTime(300)).subscribe((value) => {
      this.usersSearch.set(value.trim());
      this.usersPage.set(1);
      this.loadUsers();
    });
    this.destroyRef.onDestroy(() => {
      productSub.unsubscribe();
      inventorySub.unsubscribe();
      usersSub.unsubscribe();
    });
  }

  // ===== Navegación de pestañas =====
  protected switchTab(tab: AdminTab): void {
    if (tab === this.tab()) return;
    this.tab.set(tab);
    this.clearFeedback();
  }

  // ===== Productos =====
  protected onProductSearchInput(event: Event): void {
    this.productSearch$.next((event.target as HTMLInputElement).value);
  }

  protected openProductForm(product: Product | null = null): void {
    this.productFeedback.set(null);
    this.productEditingId.set(product ? product.id : null);
    if (product) {
      this.productForm.setValue({
        name: product.name,
        sku: product.sku,
        categoryId: product.categoryId,
        price: product.price,
        salePrice: product.salePrice,
        unit: product.unit,
        description: product.description ?? '',
        imageUrl: product.imageUrl ?? '',
        isPerishable: product.isPerishable,
        isOrganic: product.isOrganic,
        isActive: product.isActive
      });
    } else {
      this.productForm.reset({
        name: '',
        sku: '',
        categoryId: null,
        price: null,
        salePrice: null,
        unit: '',
        description: '',
        imageUrl: '',
        isPerishable: false,
        isOrganic: false,
        isActive: true
      });
    }
    this.productFormOpen.set(true);
  }

  protected closeProductForm(): void {
    this.productFormOpen.set(false);
    this.productEditingId.set(null);
    this.productFeedback.set(null);
  }

  protected saveProduct(): void {
    if (this.productForm.invalid || this.productBusy()) return;
    const editingId = this.productEditingId();
    const dto = this.productDto();
    this.productBusy.set(true);
    this.productFeedback.set(null);
    const request = editingId
      ? this.productsService.update(editingId, dto)
      : this.productsService.create(dto as CreateProductDto);
    request
      .pipe(finalize(() => this.productBusy.set(false)))
      .subscribe({
        next: () => {
          this.productFeedback.set({ type: 'success', message: editingId ? 'Producto actualizado.' : 'Producto creado.' });
          this.productFormOpen.set(false);
          this.productEditingId.set(null);
          this.loadProducts();
          this.loadInventory();
        },
        error: (err) => this.productFeedback.set({ type: 'error', message: this.apiMessage(err, 'No se pudo guardar el producto.') })
      });
  }

  /** DTO para crear (omite opcionales vacíos) o actualizar (envía null para limpiar). */
  private productDto(): UpdateProductDto | CreateProductDto {
    const v = this.productForm.value;
    const base = {
      name: v.name ?? undefined,
      sku: v.sku ?? undefined,
      price: v.price ?? undefined,
      unit: v.unit ?? undefined,
      description: v.description || undefined,
      isPerishable: v.isPerishable ?? undefined,
      isOrganic: v.isOrganic ?? undefined,
      isActive: v.isActive ?? undefined,
      salePrice: v.salePrice ?? undefined
    };
    if (this.productEditingId()) {
      // Actualizar: null limpia categoría, imagen, descripción o precio de oferta.
      return {
        ...base,
        categoryId: v.categoryId || null,
        imageUrl: v.imageUrl || null,
        salePrice: v.salePrice ?? null
      } as UpdateProductDto;
    }
    // Crear: solo se envían campos con valor.
    return {
      ...base,
      categoryId: v.categoryId ?? undefined,
      imageUrl: v.imageUrl || undefined
    } as CreateProductDto;
  }

  protected toggleProductActive(product: Product): void {
    this.productsService.update(product.id, { isActive: !product.isActive }).subscribe({
      next: () => this.loadProducts(),
      error: () => this.setProductsError('No se pudo cambiar el estado del producto.')
    });
  }

  protected removeProduct(product: Product): void {
    if (!window.confirm(`¿Eliminar "${product.name}"? Esta acción no se puede deshacer.`)) return;
    this.productsService.remove(product.id).subscribe({
      next: () => {
        this.loadProducts();
        this.loadInventory();
      },
      error: () => this.setProductsError('No se pudo eliminar el producto.')
    });
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.uploadingImage.set(true);
    this.productFeedback.set(null);
    this.productsService
      .uploadImage(file)
      .pipe(finalize(() => this.uploadingImage.set(false)))
      .subscribe({
        next: (res) => {
          this.productForm.controls.imageUrl.setValue(res.imageUrl);
          this.productFeedback.set({ type: 'success', message: 'Imagen subida.' });
        },
        error: (err) =>
          this.productFeedback.set({
            type: 'error',
            message: this.apiMessage(err, 'No se pudo subir la imagen (jpg/png/webp/gif/avif, máx. 5 MB).')
          })
      });
    input.value = '';
  }

  // ===== Categorías =====
  protected openCategoryForm(category: Category | null = null): void {
    this.categoryFeedback.set(null);
    this.categoryEditingId.set(category ? category.id : null);
    if (category) {
      this.categoryForm.setValue({
        name: category.name,
        description: category.description ?? '',
        parentId: category.parentId,
        isActive: category.isActive
      });
    } else {
      this.categoryForm.reset({
        name: '',
        description: '',
        parentId: null,
        isActive: true
      });
    }
    this.categoryFormOpen.set(true);
  }

  protected closeCategoryForm(): void {
    this.categoryFormOpen.set(false);
    this.categoryEditingId.set(null);
    this.categoryFeedback.set(null);
  }

  protected saveCategory(): void {
    if (this.categoryForm.invalid || this.categoryBusy()) return;
    const editingId = this.categoryEditingId();
    const v = this.categoryForm.value;
    const dto: UpdateCategoryDto = {
      name: v.name ?? undefined,
      description: v.description || null,
      parentId: v.parentId || null,
      isActive: v.isActive ?? undefined
    };
    this.categoryBusy.set(true);
    this.categoryFeedback.set(null);
    const request = editingId
      ? this.categoriesService.update(editingId, dto)
      : this.categoriesService.create(dto as CreateCategoryDto);
    request
      .pipe(finalize(() => this.categoryBusy.set(false)))
      .subscribe({
        next: () => {
          this.categoryFeedback.set({ type: 'success', message: editingId ? 'Categoría actualizada.' : 'Categoría creada.' });
          this.categoryFormOpen.set(false);
          this.categoryEditingId.set(null);
          this.loadCategories();
          this.loadAllCategories();
        },
        error: (err) =>
          this.categoryFeedback.set({ type: 'error', message: this.apiMessage(err, 'No se pudo guardar la categoría.') })
      });
  }

  protected removeCategory(category: Category): void {
    if (!window.confirm(`¿Eliminar la categoría "${category.name}"?`)) return;
    this.categoriesService.remove(category.id).subscribe({
      next: () => {
        this.loadCategories();
        this.loadAllCategories();
        this.loadProducts();
      },
      error: (err) =>
        this.categoryFeedback.set({ type: 'error', message: this.apiMessage(err, 'No se pudo eliminar la categoría.') })
    });
  }

  // ===== Inventario =====
  protected onInventorySearchInput(event: Event): void {
    this.inventorySearch$.next((event.target as HTMLInputElement).value);
  }

  protected openInventoryForm(item: InventoryItem): void {
    this.inventoryFeedback.set(null);
    this.inventoryEditingId.set(item.productId);
    this.inventoryForm.setValue({
      stockQuantity: item.stockQuantity,
      minStockLevel: item.minStockLevel,
      expirationDate: item.expirationDate ?? ''
    });
    this.adjustForm.reset();
  }

  protected closeInventoryForm(): void {
    this.inventoryEditingId.set(null);
    this.inventoryFeedback.set(null);
  }

  protected saveInventory(): void {
    const productId = this.inventoryEditingId();
    if (!productId || this.inventoryBusy()) return;
    const v = this.inventoryForm.value;
    const dto: UpdateInventoryDto = {
      stockQuantity: v.stockQuantity ?? undefined,
      minStockLevel: v.minStockLevel ?? undefined,
      expirationDate: v.expirationDate || null
    };
    if (dto.stockQuantity === undefined && dto.minStockLevel === undefined && dto.expirationDate === null) {
      this.inventoryFeedback.set({ type: 'error', message: 'Ingresa al menos un valor para actualizar.' });
      return;
    }
    this.inventoryBusy.set(true);
    this.inventoryFeedback.set(null);
    this.inventoryService
      .update(productId, dto)
      .pipe(finalize(() => this.inventoryBusy.set(false)))
      .subscribe({
        next: () => {
          this.inventoryFeedback.set({ type: 'success', message: 'Inventario actualizado.' });
          this.inventoryEditingId.set(null);
          this.loadInventory();
          this.loadProducts();
        },
        error: (err) =>
          this.inventoryFeedback.set({ type: 'error', message: this.apiMessage(err, 'No se pudo actualizar el inventario.') })
      });
  }

  protected adjustStock(item: InventoryItem): void {
    const quantity = this.adjustForm.getRawValue().quantity;
    if (quantity === null || Number.isNaN(quantity) || quantity === 0) {
      this.inventoryFeedback.set({ type: 'error', message: 'Ingresa una cantidad distinta de 0.' });
      return;
    }
    this.inventoryBusy.set(true);
    this.inventoryFeedback.set(null);
    this.inventoryService
      .adjust(item.productId, quantity)
      .pipe(finalize(() => this.inventoryBusy.set(false)))
      .subscribe({
        next: () => {
          this.inventoryFeedback.set({ type: 'success', message: 'Stock ajustado.' });
          this.adjustForm.reset();
          this.loadInventory();
        },
        error: (err) =>
          this.inventoryFeedback.set({ type: 'error', message: this.apiMessage(err, 'No se pudo ajustar el stock.') })
      });
  }

  // ===== Usuarios =====
  protected onUsersSearchInput(event: Event): void {
    this.usersSearch$.next((event.target as HTMLInputElement).value);
  }

  protected onRoleFilterChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.setUsersRoleFilter(value === 'ALL' ? null : (value as UserRole));
  }

  protected setUsersRoleFilter(role: UserRole | null): void {
    if (role === this.usersRoleFilter()) return;
    this.usersRoleFilter.set(role);
    this.usersPage.set(1);
    this.loadUsers();
  }

  protected onRoleChange(user: User, event: Event): void {
    const role = (event.target as HTMLSelectElement).value as UserRole;
    if (role === user.role) return;
    this.changeRole(user, role);
  }

  protected changeRole(user: User, role: UserRole): void {
    if (this.roleUpdatingId() !== null) return;
    this.roleUpdatingId.set(user.id);
    this.usersFeedback.set(null);
    this.usersService
      .updateRole(user.id, { role })
      .pipe(finalize(() => this.roleUpdatingId.set(null)))
      .subscribe({
        next: () => {
          this.usersFeedback.set({ type: 'success', message: `Rol cambiado a ${userRoleLabel(role)}.` });
          this.loadUsers(true);
        },
        error: (err) => {
          this.usersFeedback.set({ type: 'error', message: this.apiMessage(err, 'No se pudo cambiar el rol.') });
          // Recarga para restaurar el rol real en el select.
          this.loadUsers(true);
        }
      });
  }

  /** No se puede cambiar el propio rol (evita salirse del panel por accidente). */
  protected isSelf(user: User): boolean {
    return user.id === this.auth.user()?.id;
  }

  protected userFullName(user: User): string {
    return [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.email;
  }

  protected userInitials(user: User): string {
    const parts = [user.firstName, user.lastName].filter(Boolean) as string[];
    if (parts.length === 0) return (user.email.charAt(0) || '?').toUpperCase();
    return parts
      .map((p) => p.charAt(0))
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  protected roleClass(role: UserRole): string {
    return ROLE_CLASS[role];
  }

  protected loadUsers(silent = false): void {
    if (!silent) {
      this.usersLoading.set(true);
      this.usersError.set(false);
      this.usersErrorMsg.set('');
    }
    const search = this.usersSearch().trim();
    const role = this.usersRoleFilter();
    this.usersService
      .findAll({
        page: this.usersPage(),
        limit: 20,
        search: search || undefined,
        role: role ?? undefined
      })
      .subscribe({
        next: (res) => {
          this.users.set(res.data);
          this.usersTotal.set(res.total);
          this.usersPage.set(res.page);
          this.usersLoading.set(false);
        },
        error: () => {
          if (!silent) {
            this.usersLoading.set(false);
            this.usersError.set(true);
            this.usersErrorMsg.set('Verifica que el backend esté disponible e inténtalo de nuevo.');
          }
        }
      });
  }

  protected goToUsersPage(page: number): void {
    if (page < 1 || page > this.usersTotalPages() || page === this.usersPage()) return;
    this.usersPage.set(page);
    this.loadUsers();
  }

  // ===== Cargas =====
  protected loadProducts(): void {
    this.productsLoading.set(true);
    this.productsError.set(false);
    this.productsErrorMsg.set('');
    const search = this.productSearch().trim();
    this.productsService
      .findAll({ page: this.productsPage(), limit: 20, search: search || undefined })
      .subscribe({
        next: (res) => {
          this.products.set(res.data);
          this.productsTotal.set(res.total);
          this.productsPage.set(res.page);
          this.productsLoading.set(false);
        },
        error: () => {
          this.productsLoading.set(false);
          this.productsError.set(true);
          this.productsErrorMsg.set('Verifica que el backend esté disponible e inténtalo de nuevo.');
        }
      });
  }

  protected loadCategories(): void {
    this.categoriesLoading.set(true);
    this.categoriesError.set(false);
    this.categoriesErrorMsg.set('');
    this.categoriesService
      .findAll({ page: this.categoriesPage(), limit: 20 })
      .subscribe({
        next: (res) => {
          this.categories.set(res.data);
          this.categoriesTotal.set(res.total);
          this.categoriesPage.set(res.page);
          this.categoriesLoading.set(false);
        },
        error: () => {
          this.categoriesLoading.set(false);
          this.categoriesError.set(true);
          this.categoriesErrorMsg.set('Verifica que el backend esté disponible e inténtalo de nuevo.');
        }
      });
  }

  private loadAllCategories(): void {
    this.categoriesService.findAll({ page: 1, limit: 100 }).subscribe({
      next: (res) => this.allCategories.set(res.data),
      error: () => this.allCategories.set([])
    });
  }

  protected loadInventory(): void {
    this.inventoryLoading.set(true);
    this.inventoryError.set(false);
    this.inventoryErrorMsg.set('');
    const search = this.inventorySearch().trim();
    this.inventoryService
      .findAll({ page: this.inventoryPage(), limit: 20, search: search || undefined })
      .subscribe({
        next: (res) => {
          this.inventory.set(res.data);
          this.inventoryTotal.set(res.total);
          this.inventoryPage.set(res.page);
          this.inventoryLoading.set(false);
        },
        error: () => {
          this.inventoryLoading.set(false);
          this.inventoryError.set(true);
          this.inventoryErrorMsg.set('Verifica que el backend esté disponible e inténtalo de nuevo.');
        }
      });
  }

  // ===== Paginación y utilidades =====
  protected goToProductsPage(page: number): void {
    if (page < 1 || page > this.productsTotalPages() || page === this.productsPage()) return;
    this.productsPage.set(page);
    this.loadProducts();
  }

  protected goToCategoriesPage(page: number): void {
    if (page < 1 || page > this.categoriesTotalPages() || page === this.categoriesPage()) return;
    this.categoriesPage.set(page);
    this.loadCategories();
  }

  protected goToInventoryPage(page: number): void {
    if (page < 1 || page > this.inventoryTotalPages() || page === this.inventoryPage()) return;
    this.inventoryPage.set(page);
    this.loadInventory();
  }

  protected categoryName(id: string | null): string {
    if (!id) return '—';
    return this.allCategories().find((c) => c.id === id)?.name ?? '—';
  }

  private setProductsError(message: string): void {
    this.productFeedback.set({ type: 'error', message });
  }

  /** Usa el mensaje del backend si viene; si no, el mensaje local. */
  private apiMessage(err: unknown, fallback: string): string {
    const message = (err as { error?: { message?: string } }).error?.message;
    return message ?? fallback;
  }

  private clearFeedback(): void {
    this.productFeedback.set(null);
    this.categoryFeedback.set(null);
    this.inventoryFeedback.set(null);
    this.usersFeedback.set(null);
  }
}
