import { Component, computed, inject, signal } from '@angular/core';

import { Address } from '../../core/models/address.model';
import { AddressService } from '../../core/services/address.service';
import { AddressForm } from '../../shared/address/address-form';

@Component({
  selector: 'app-addresses-page',
  imports: [AddressForm],
  templateUrl: './addresses-page.html',
  styleUrl: './addresses-page.scss'
})
export class AddressesPage {
  private readonly addressService = inject(AddressService);

  protected readonly addresses = signal<Address[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal(false);
  protected readonly showForm = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly errorMsg = signal<string | null>(null);

  /** Dirección en edición (la que alimenta a <app-address-form>). */
  protected readonly editingAddress = computed<Address | null>(() => {
    const id = this.editingId();
    if (!id) return null;
    return this.addresses().find((a) => a.id === id) ?? null;
  });

  constructor() {
    this.load();
  }

  protected load(silent = false): void {
    if (!silent) {
      this.loading.set(true);
      this.error.set(false);
    }
    this.addressService.findAll().subscribe({
      next: (list) => {
        this.addresses.set(list);
        this.loading.set(false);
      },
      error: () => {
        if (!silent) {
          this.loading.set(false);
          this.error.set(true);
        }
      }
    });
  }

  protected toggleForm(): void {
    this.showForm.set(!this.showForm());
    this.editingId.set(null);
    this.errorMsg.set(null);
    if (this.showForm()) this.scrollFormIntoView();
  }

  protected startEdit(address: Address): void {
    this.editingId.set(address.id);
    this.showForm.set(false);
    this.errorMsg.set(null);
    this.scrollFormIntoView();
  }

  /** Lleva el formulario a la vista (aparece al final de la lista). */
  private scrollFormIntoView(): void {
    setTimeout(() => {
      document.getElementById('address-form')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 0);
  }

  protected cancelForm(): void {
    if (this.editingId()) {
      this.editingId.set(null);
      this.errorMsg.set(null);
    } else {
      this.toggleForm();
    }
  }

  /** El guardado lo gestiona <app-address-form>; aquí solo recargamos la lista. */
  protected onSaved(_saved: Address): void {
    this.showForm.set(false);
    this.editingId.set(null);
    this.errorMsg.set(null);
    this.load(true);
  }

  /** Marca una dirección como principal (el backend desmarca las demás). */
  protected setDefault(address: Address): void {
    this.errorMsg.set(null);
    this.addressService.update(address.id, { isDefault: true }).subscribe({
      next: () => this.load(true),
      error: (err) => this.errorMsg.set(this.addressMessage(err))
    });
  }

  protected remove(address: Address): void {
    if (!window.confirm(`¿Eliminar la dirección "${address.addressLine1}"?`)) return;
    this.errorMsg.set(null);
    this.addressService.remove(address.id).subscribe({
      next: () => this.load(true),
      error: (err) => this.errorMsg.set(this.addressMessage(err))
    });
  }

  private addressMessage(err: unknown): string {
    const message = (err as { error?: { message?: string } }).error?.message;
    return message ?? 'No se pudo guardar la dirección. Inténtalo de nuevo.';
  }
}
