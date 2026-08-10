import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';

import { environment } from '../../../environments/environment';
import { CartService } from '../../core/services/cart.service';
import { Address } from '../../core/models/address.model';
import { Order } from '../../core/models/order.model';
import { Product } from '../../core/models/product.model';
import { CartResponse } from '../../core/models/cart.model';
import { CheckoutPage } from './checkout-page';

const ADDRESS_1: Address = {
  id: 'addr-1',
  addressLine1: 'Av. Providencia 1234',
  addressLine2: null,
  city: 'Santiago',
  stateProvince: 'Región Metropolitana',
  postalCode: null,
  deliveryNotes: null,
  isDefault: true,
  createdAt: '2026-01-01T00:00:00.000Z'
};

const ADDRESS_2: Address = {
  id: 'addr-2',
  addressLine1: 'Calle Los Álamos 500',
  addressLine2: 'Depto 3B',
  city: 'Valparaíso',
  stateProvince: 'Valparaíso',
  postalCode: null,
  deliveryNotes: null,
  isDefault: false,
  createdAt: '2026-01-02T00:00:00.000Z'
};

const PRODUCT: Product = {
  id: 'p-1',
  categoryId: null,
  sku: 'AGUA-1',
  name: 'Agua Mineral 1.5L',
  slug: 'agua-mineral-1-5l',
  description: null,
  price: 1.4,
  salePrice: null,
  unit: 'botella',
  isPerishable: false,
  isOrganic: false,
  imageUrl: null,
  isActive: true
};

const CART_RESPONSE: CartResponse = {
  id: 'cart-1',
  items: [
    {
      productId: 'p-1',
      quantity: 2,
      product: {
        id: 'p-1',
        sku: 'AGUA-1',
        name: 'Agua Mineral 1.5L',
        slug: 'agua-mineral-1-5l',
        price: 1.4,
        salePrice: null,
        unit: 'botella',
        imageUrl: null,
        inStock: true,
        stockStatus: 'IN_STOCK'
      },
      subtotal: 2.8
    }
  ],
  itemsCount: 2,
  subtotal: 2.8,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z'
};

const ORDER: Order = {
  id: 'order-1',
  orderNumber: 211,
  userId: 'u-1',
  user: null,
  deliveredBy: null,
  status: 'PAID',
  subtotal: 2.8,
  deliveryFee: 0,
  total: 2.8,
  deliverySlotStart: null,
  deliverySlotEnd: null,
  shippingAddress: {
    addressLine1: 'Av. Providencia 1234',
    addressLine2: null,
    city: 'Santiago',
    stateProvince: 'Región Metropolitana',
    postalCode: null,
    deliveryNotes: null
  },
  items: [{ productId: 'p-1', productName: 'Agua Mineral 1.5L', unitPrice: 1.4, quantity: 2, subtotal: 2.8 }],
  payment: { id: 'pay-1', method: 'CREDIT_CARD', status: 'COMPLETED', transactionId: 'SIM-1', amount: 2.8 },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z'
};

describe('CheckoutPage', () => {
  let fixture: ComponentFixture<CheckoutPage>;
  let httpMock: HttpTestingController;
  let cart: CartService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CheckoutPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    }).compileComponents();
    fixture = TestBed.createComponent(CheckoutPage);
    httpMock = TestBed.inject(HttpTestingController);
    cart = TestBed.inject(CartService);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
    vi.restoreAllMocks();
  });

  /** Consume la petición GET /api/addresses pendiente (del constructor o recargas). */
  function flushAddresses(list: Address[]): void {
    httpMock.expectOne(`${environment.apiUrl}/api/addresses`).flush(list);
    fixture.detectChanges();
  }

  /** Agrega el producto al carrito (flujo real: POST + respuesta del servidor). */
  function addToCart(): void {
    cart.add(PRODUCT);
    httpMock.expectOne(`${environment.apiUrl}/api/carts/me/items`).flush(CART_RESPONSE);
    fixture.detectChanges();
  }

  function fillAndSubmitAddressForm(): void {
    const line1 = fixture.nativeElement.querySelector(
      'app-address-form input[formControlName="addressLine1"]'
    ) as HTMLInputElement;
    line1.value = 'Av. Providencia 1234';
    line1.dispatchEvent(new Event('input'));
    const city = fixture.nativeElement.querySelector(
      'app-address-form input[formControlName="city"]'
    ) as HTMLInputElement;
    city.value = 'Santiago';
    city.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const form = fixture.nativeElement.querySelector('app-address-form form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }


  it('loads addresses and selects the first one (the default) by default', () => {
    flushAddresses([ADDRESS_1, ADDRESS_2]);

    const cards = fixture.nativeElement.querySelectorAll('.address-card');
    expect(cards.length).toBe(2);
    expect(cards[0].classList.contains('selected')).toBe(true);
    expect(cards[1].classList.contains('selected')).toBe(false);
    expect(cards[0].textContent).toContain('Av. Providencia 1234');
    expect(cards[0].textContent).toContain('Principal');
  });

  it('selects another address when clicked', () => {
    flushAddresses([ADDRESS_1, ADDRESS_2]);

    const radios = fixture.nativeElement.querySelectorAll('input[name="address"]');
    (radios[1] as HTMLInputElement).click();
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('.address-card');
    expect(cards[1].classList.contains('selected')).toBe(true);
    expect(cards[0].classList.contains('selected')).toBe(false);
  });

  it('deletes an address after confirmation and reselects if it was the selected one', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    flushAddresses([ADDRESS_1, ADDRESS_2]);
    expect(fixture.nativeElement.querySelectorAll('.address-card.selected')[0].textContent).toContain(
      'Av. Providencia 1234'
    );

    (fixture.nativeElement.querySelectorAll('.address-actions .mini-btn.danger')[0] as HTMLButtonElement).click();

    const del = httpMock.expectOne(`${environment.apiUrl}/api/addresses/addr-1`);
    expect(del.request.method).toBe('DELETE');
    del.flush(null);
    // Tras borrar, la página recarga la lista.
    httpMock.expectOne(`${environment.apiUrl}/api/addresses`).flush([ADDRESS_2]);
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('.address-card');
    expect(cards.length).toBe(1);
    expect(cards[0].textContent).toContain('Calle Los Álamos 500');
    expect(cards[0].classList.contains('selected')).toBe(true);
  });

  it('saves a new address from the form, reloads and selects it', () => {
    // Sin direcciones el form del checkout se muestra automáticamente.
    flushAddresses([]);
    expect(fixture.nativeElement.querySelectorAll('.address-card').length).toBe(0);
    expect(fixture.nativeElement.querySelector('app-address-form')).toBeTruthy();

    fillAndSubmitAddressForm();

    const create = httpMock.expectOne(`${environment.apiUrl}/api/addresses`);
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toEqual({ addressLine1: 'Av. Providencia 1234', city: 'Santiago' });
    create.flush({ ...ADDRESS_1 });
    // Tras guardar, la página recarga la lista.
    httpMock.expectOne(`${environment.apiUrl}/api/addresses`).flush([ADDRESS_1]);
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('.address-card');
    expect(cards.length).toBe(1);
    expect(cards[0].classList.contains('selected')).toBe(true);
  });

  it('confirms the order with the default payment method and shows the success screen', () => {
    addToCart();
    flushAddresses([ADDRESS_1]);
    expect(fixture.nativeElement.textContent).toContain('Agua Mineral 1.5L');

    const confirmBtn = fixture.nativeElement.querySelector('.confirm') as HTMLButtonElement;
    expect(confirmBtn.disabled).toBe(false);
    confirmBtn.click();

    const create = httpMock.expectOne(`${environment.apiUrl}/api/orders`);
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toEqual({ paymentMethod: 'CREDIT_CARD', addressId: 'addr-1' });
    create.flush(ORDER);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('¡Pedido confirmado!');
    expect(fixture.nativeElement.textContent).toContain('#211');
    expect(fixture.nativeElement.textContent).toContain('$2.80');
    // El servidor ya consumió el carrito: la vista de éxito no lista ítems.
    expect(fixture.nativeElement.querySelector('.success-items')).toBeTruthy();
  });

  it('confirms the order with the selected payment method', () => {
    addToCart();
    flushAddresses([ADDRESS_1]);

    const transfer = Array.from(fixture.nativeElement.querySelectorAll('.payment-option')).find((el) =>
      (el as HTMLElement).textContent?.includes('Transferencia')
    ) as HTMLElement;
    (transfer.querySelector('input') as HTMLInputElement).click();
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.confirm') as HTMLButtonElement).click();

    const create = httpMock.expectOne(`${environment.apiUrl}/api/orders`);
    expect(create.request.body).toEqual({ paymentMethod: 'TRANSFER', addressId: 'addr-1' });
    create.flush({ ...ORDER, payment: { ...ORDER.payment!, method: 'TRANSFER', status: 'PENDING' } });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Transferencia bancaria');
  });

  it('shows the error message when the order fails', () => {
    addToCart();
    flushAddresses([ADDRESS_1]);

    (fixture.nativeElement.querySelector('.confirm') as HTMLButtonElement).click();

    const create = httpMock.expectOne(`${environment.apiUrl}/api/orders`);
    create.flush({ message: 'Sin stock suficiente' }, { status: 400, statusText: 'Bad Request' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Sin stock suficiente');
    // No se muestra la pantalla de éxito.
    expect(fixture.nativeElement.querySelector('.success')).toBeNull();
  });

  it('keeps the confirm button disabled without a selected address (even with cart items)', () => {
    addToCart();
    flushAddresses([]);

    const confirmBtn = fixture.nativeElement.querySelector('.confirm') as HTMLButtonElement;
    expect(confirmBtn.disabled).toBe(true);
  });
});
