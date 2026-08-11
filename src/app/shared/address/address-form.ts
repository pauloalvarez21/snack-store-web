import { Component, effect, inject, input, output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';

import { Address, CreateAddressDto } from '../../core/models/address.model';
import { AddressService } from '../../core/services/address.service';
import { fieldError, notBlank } from '../../core/utils/validation';

/**
 * Formulario de dirección reutilizable (libreta de direcciones y checkout).
 * Se autogestiona: valida, guarda (crea o actualiza según [editing]) y emite
 * el resultado. El padre controla la visibilidad y recarga su lista con `saved`.
 */
@Component({
  selector: 'app-address-form',
  imports: [ReactiveFormsModule],
  templateUrl: './address-form.html',
  styleUrl: './address-form.scss'
})
export class AddressForm {
  private readonly addressService = inject(AddressService);

  /** Dirección en edición (null = crear nueva). Al cambiar, rellena/resetea el form. */
  readonly editing = input<Address | null>(null);
  /** Muestra el botón "Cancelar" (hay algo que cancelar). */
  readonly showCancel = input(false);
  /** Clase del botón de guardar (p. ej. 'btn-primary' | 'btn-secondary'). */
  readonly submitClass = input('btn-primary');

  /** Dirección guardada (creada o actualizada). */
  readonly saved = output<Address>();
  readonly cancel = output<void>();

  protected readonly saving = signal(false);
  protected readonly errorMsg = signal<string | null>(null);

  protected readonly addressForm = new FormGroup({
    addressLine1: new FormControl('', [Validators.required, notBlank]),
    addressLine2: new FormControl(''),
    city: new FormControl('', [Validators.required, notBlank]),
    stateProvince: new FormControl(''),
    deliveryNotes: new FormControl('')
  });

  constructor() {
    // Rellena el form al editar; lo resetea al volver al modo "nueva".
    effect(() => {
      const editing = this.editing();
      this.addressForm.reset(
        editing
          ? {
              addressLine1: editing.addressLine1,
              addressLine2: editing.addressLine2 ?? '',
              city: editing.city,
              stateProvince: editing.stateProvince ?? '',
              deliveryNotes: editing.deliveryNotes ?? ''
            }
          : undefined
      );
      this.errorMsg.set(null);
    });
  }

  protected save(): void {
    if (this.addressForm.invalid) {
      this.addressForm.markAllAsTouched();
      return;
    }
    const dto = this.addressFormValue();
    const editing = this.editing();
    const request = editing ? this.addressService.update(editing.id, dto) : this.addressService.create(dto);
    this.saving.set(true);
    this.errorMsg.set(null);
    request.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (saved) => this.saved.emit(saved),
      error: (err) => this.errorMsg.set(this.addressMessage(err))
    });
  }

  protected cancelForm(): void {
    this.cancel.emit();
  }

  private addressFormValue(): CreateAddressDto {
    const v = this.addressForm.getRawValue();
    const dto: CreateAddressDto = {
      addressLine1: (v.addressLine1 ?? '').trim(),
      city: (v.city ?? '').trim()
    };
    const line2 = v.addressLine2?.trim();
    const state = v.stateProvince?.trim();
    const notes = v.deliveryNotes?.trim();
    if (line2) dto.addressLine2 = line2;
    if (state) dto.stateProvince = state;
    if (notes) dto.deliveryNotes = notes;
    return dto;
  }

  private addressMessage(err: unknown): string {
    const message = (err as { error?: { message?: string } }).error?.message;
    return message ?? 'No se pudo guardar la dirección. Inténtalo de nuevo.';
  }

  protected errorFor(field: string): string | null {
    return fieldError(this.addressForm.get(field));
  }
}
