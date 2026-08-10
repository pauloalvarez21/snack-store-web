import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { Address } from '../../core/models/address.model';
import { Order, PaymentMethod } from '../../core/models/order.model';
import { AddressService } from '../../core/services/address.service';
import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';
import { OrderService } from '../../core/services/order.service';
import { AddressForm } from '../../shared/address/address-form';
import { formatPrice, orderStatusLabel, productEmoji } from '../../core/utils/format';

interface PaymentOption {
  value: PaymentMethod;
  label: string;
  icon: string;
  note: string;
}

const PAYMENT_OPTIONS: PaymentOption[] = [
  {
    value: 'CREDIT_CARD',
    label: 'Tarjeta de crédito',
    icon: '💳',
    note: 'Cobro inmediato al confirmar'
  },
  {
    value: 'DEBIT_CARD',
    label: 'Tarjeta de débito',
    icon: '🏦',
    note: 'Cobro inmediato al confirmar'
  },
  {
    value: 'TRANSFER',
    label: 'Transferencia bancaria',
    icon: '💸',
    note: 'Queda pendiente hasta confirmar el pago'
  },
  {
    value: 'CASH_ON_DELIVERY',
    label: 'Pago contra entrega',
    icon: '💵',
    note: 'Pagas en efectivo al recibir'
  }
];

@Component({
  selector: 'app-checkout-page',
  imports: [RouterLink, AddressForm],
  templateUrl: './checkout-page.html',
  styleUrl: './checkout-page.scss'
})
export class CheckoutPage {
  protected readonly cart = inject(CartService);
  protected readonly auth = inject(AuthService);
  private readonly addressService = inject(AddressService);
  private readonly orderService = inject(OrderService);
  private readonly router = inject(Router);

  // ===== Pedido =====
  protected readonly order = signal<Order | null>(null);
  protected readonly submitting = signal(false);
  protected readonly errorMsg = signal<string | null>(null);
  protected readonly paymentMethod = signal<PaymentMethod>('CREDIT_CARD');
  protected readonly paymentOptions = PAYMENT_OPTIONS;

  // ===== Direcciones =====
  protected readonly addresses = signal<Address[]>([]);
  protected readonly selectedAddressId = signal<string | null>(null);
  protected readonly addressesLoading = signal(true);
  protected readonly addressesError = signal(false);
  protected readonly showAddressForm = signal(false);
  protected readonly editingAddressId = signal<string | null>(null);
  protected readonly addressError = signal<string | null>(null);

  /** Dirección en edición (la que alimenta a <app-address-form>). */
  protected readonly editingAddress = computed<Address | null>(() => {
    const id = this.editingAddressId();
    if (!id) return null;
    return this.addresses().find((a) => a.id === id) ?? null;
  });

  protected readonly formatPrice = formatPrice;
  protected readonly productEmoji = productEmoji;
  protected readonly orderStatusLabel = orderStatusLabel;

  constructor() {
    this.loadAddresses();
  }

  protected paymentLabel(method: PaymentMethod): string {
    return PAYMENT_OPTIONS.find((opt) => opt.value === method)?.label ?? method;
  }

  // ===== Direcciones =====

  protected loadAddresses(): void {
    this.addressesLoading.set(true);
    this.addressesError.set(false);
    this.addressService.findAll().subscribe({
      next: (list) => {
        this.addresses.set(list);
        this.addressesLoading.set(false);
        // Por defecto la principal (primera de la lista); si la seleccionada
        // ya no existe, volvemos a la primera.
        const selected = this.selectedAddressId();
        if (!selected || !list.some((a) => a.id === selected)) {
          this.selectedAddressId.set(list[0]?.id ?? null);
        }
      },
      error: () => {
        this.addressesLoading.set(false);
        this.addressesError.set(true);
      }
    });
  }

  protected selectAddress(id: string): void {
    this.selectedAddressId.set(id);
  }

  protected toggleAddressForm(): void {
    this.showAddressForm.set(!this.showAddressForm());
    this.editingAddressId.set(null);
    this.addressError.set(null);
  }

  protected startEdit(address: Address): void {
    this.editingAddressId.set(address.id);
    this.showAddressForm.set(false);
    this.addressError.set(null);
  }

  protected cancelAddressForm(): void {
    if (this.editingAddressId()) {
      this.editingAddressId.set(null);
      this.addressError.set(null);
    } else {
      this.toggleAddressForm();
    }
  }

  /** El guardado lo gestiona <app-address-form>; aquí recargamos y seleccionamos. */
  protected onAddressSaved(saved: Address): void {
    this.reloadAfterAddressSave(saved.id);
  }

  protected removeAddress(address: Address): void {
    if (!window.confirm(`¿Eliminar la dirección "${address.addressLine1}"?`)) return;
    this.addressError.set(null);
    this.addressService.remove(address.id).subscribe({
      next: () => {
        this.addressService.findAll().subscribe({
          next: (list) => {
            this.addresses.set(list);
            if (this.selectedAddressId() === address.id) {
              this.selectedAddressId.set(list[0]?.id ?? null);
            }
          },
          error: () => this.addressesError.set(true)
        });
      },
      error: (err) => this.addressError.set(this.addressMessage(err))
    });
  }

  private addressMessage(err: unknown): string {
    const message = (err as { error?: { message?: string } }).error?.message;
    return message ?? 'No se pudo guardar la dirección. Inténtalo de nuevo.';
  }

  private reloadAfterAddressSave(savedId: string): void {
    this.addressService.findAll().subscribe({
      next: (list) => {
        this.addresses.set(list);
        this.selectedAddressId.set(savedId);
        this.showAddressForm.set(false);
        this.editingAddressId.set(null);
      },
      error: () => this.addressesError.set(true)
    });
  }

  // ===== Pedido =====

  protected confirmOrder(): void {
    if (this.cart.items().length === 0 || this.submitting()) return;
    const addressId = this.selectedAddressId();
    if (!addressId) return;
    this.submitting.set(true);
    this.errorMsg.set(null);
    this.orderService
      .createOrder(this.paymentMethod(), addressId)
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (created) => {
          this.order.set(created);
          // El servidor ya consumió el carrito al crear el pedido.
          this.cart.reset();
          this.cart.open.set(false);
        },
        error: (err) => this.errorMsg.set(this.orderError(err))
      });
  }

  private orderError(err: unknown): string {
    const status = (err as { status?: number }).status;
    if (status === 400) {
      const message = (err as { error?: { message?: string } }).error?.message;
      return message ?? 'No pudimos procesar tu pedido. Revisa el stock e inténtalo de nuevo.';
    }
    return 'Hubo un error al crear tu pedido. Inténtalo de nuevo.';
  }

  protected goBack(): void {
    this.router.navigateByUrl('/catalogo');
  }
}
