import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';
import { OrderService } from '../../core/services/order.service';
import { DeliveryInfo, Order } from '../../core/models/order.model';
import { formatPrice, productEmoji } from '../../core/utils/format';

@Component({
  selector: 'app-checkout-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './checkout-page.html',
  styleUrl: './checkout-page.scss'
})
export class CheckoutPage {
  protected readonly cart = inject(CartService);
  private readonly auth = inject(AuthService);
  private readonly orderService = inject(OrderService);
  private readonly router = inject(Router);

  protected readonly order = signal<Order | null>(null);
  protected readonly submitting = signal(false);
  protected readonly formatPrice = formatPrice;
  protected readonly productEmoji = productEmoji;

  protected readonly deliveryForm = new FormGroup({
    customerName: new FormControl('', [Validators.required]),
    phone: new FormControl('', [Validators.required]),
    address: new FormControl('', [Validators.required])
  });

  constructor() {
    const user = this.auth.user();
    this.deliveryForm.patchValue({
      customerName: user ? `${user.firstName} ${user.lastName}` : '',
      phone: user?.phone ?? ''
    });
  }

  protected confirmOrder(): void {
    if (this.deliveryForm.invalid) {
      this.deliveryForm.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.orderService
      .createOrder(this.cart.items(), this.deliveryForm.getRawValue() as DeliveryInfo)
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (created) => {
          this.order.set(created);
          this.cart.clear();
          this.cart.open.set(false);
        },
        error: () => this.router.navigateByUrl('/catalogo')
      });
  }

  protected errorFor(form: FormGroup, field: string): string | null {
    const control = form.get(field);
    if (!control?.errors || (!control.touched && !control.dirty)) return null;
    if (control.errors['required']) return 'Este campo es obligatorio.';
    return null;
  }
}
