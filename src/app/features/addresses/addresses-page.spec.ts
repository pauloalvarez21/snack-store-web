import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { environment } from '../../../environments/environment';
import { Address } from '../../core/models/address.model';
import { AddressesPage } from './addresses-page';

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
  deliveryNotes: 'Llamar al llegar',
  isDefault: false,
  createdAt: '2026-01-02T00:00:00.000Z'
};

describe('AddressesPage', () => {
  let fixture: ComponentFixture<AddressesPage>;
  let component: AddressesPage;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddressesPage],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();
    fixture = TestBed.createComponent(AddressesPage);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
    vi.restoreAllMocks();
  });

  function flushAddresses(list: Address[]): void {
    httpMock.expectOne(`${environment.apiUrl}/api/addresses`).flush(list);
    fixture.detectChanges();
  }

  it('loads and renders the address list with the default badge', () => {
    flushAddresses([ADDRESS_1, ADDRESS_2]);

    const cards = fixture.nativeElement.querySelectorAll('.address-card');
    expect(cards.length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('Av. Providencia 1234');
    expect(fixture.nativeElement.textContent).toContain('Calle Los Álamos 500');
    expect(fixture.nativeElement.textContent).toContain('Principal');
  });

  it('shows the empty state and renders the form when there are no addresses', () => {
    flushAddresses([]);

    expect(fixture.nativeElement.textContent).toContain('Aún no tienes direcciones guardadas');
    // Sin direcciones el formulario se muestra automáticamente.
    expect(fixture.nativeElement.querySelector('app-address-form')).toBeTruthy();
  });

  it('shows the error box and reloads on retry', () => {
    httpMock.expectOne(`${environment.apiUrl}/api/addresses`).flush(
      { message: 'Error' },
      { status: 500, statusText: 'Server Error' }
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No pudimos cargar tus direcciones');

    (fixture.nativeElement.querySelector('.error-box button') as HTMLButtonElement).click();
    const retry = httpMock.expectOne(`${environment.apiUrl}/api/addresses`);
    expect(retry.request.method).toBe('GET');
    retry.flush([ADDRESS_1]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.address-card').length).toBe(1);
  });

  it('deletes an address after confirmation and reloads the list', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    flushAddresses([ADDRESS_1, ADDRESS_2]);

    (fixture.nativeElement.querySelectorAll('.mini-btn.danger')[0] as HTMLButtonElement).click();

    const del = httpMock.expectOne(`${environment.apiUrl}/api/addresses/addr-1`);
    expect(del.request.method).toBe('DELETE');
    del.flush(null);
    httpMock.expectOne(`${environment.apiUrl}/api/addresses`).flush([ADDRESS_2]);
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('.address-card');
    expect(cards.length).toBe(1);
    expect(fixture.nativeElement.textContent).not.toContain('Av. Providencia 1234');
  });

  it('does not delete without confirmation', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    flushAddresses([ADDRESS_1]);

    (fixture.nativeElement.querySelector('.mini-btn.danger') as HTMLButtonElement).click();

    // Ninguna petición DELETE; solo quedó la inicial ya consumida.
    expect(fixture.nativeElement.querySelectorAll('.address-card').length).toBe(1);
  });

  it('marks an address as default and reloads', () => {
    flushAddresses([ADDRESS_1, ADDRESS_2]);

    const buttons = fixture.nativeElement.querySelectorAll('.mini-btn');
    const makeDefault = Array.from(buttons).find((b) => (b as HTMLElement).textContent?.includes('Hacer principal'));
    expect(makeDefault).toBeTruthy();
    (makeDefault as HTMLButtonElement).click();

    const patch = httpMock.expectOne(`${environment.apiUrl}/api/addresses/addr-2`);
    expect(patch.request.method).toBe('PATCH');
    expect(patch.request.body).toEqual({ isDefault: true });
    patch.flush({ ...ADDRESS_2, isDefault: true });
    httpMock.expectOne(`${environment.apiUrl}/api/addresses`).flush([ADDRESS_2, ADDRESS_1]);
    fixture.detectChanges();

    // El badge Principal aparece junto a la dirección que se marcó.
    expect(fixture.nativeElement.textContent).toContain('Principal');
  });

  it('shows the form when adding a new address', () => {
    flushAddresses([ADDRESS_1]);
    expect(fixture.nativeElement.querySelector('app-address-form')).toBeNull();

    const addBtn = Array.from(fixture.nativeElement.querySelectorAll('button')).find((b) =>
      (b as HTMLElement).textContent?.includes('Agregar dirección')
    ) as HTMLButtonElement;
    addBtn.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-address-form')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Nueva dirección');
  });

  it('saves a new address from the form, reloads the list and closes the form', () => {
    flushAddresses([ADDRESS_1]);

    const addBtn = Array.from(fixture.nativeElement.querySelectorAll('button')).find((b) =>
      (b as HTMLElement).textContent?.includes('Agregar dirección')
    ) as HTMLButtonElement;
    addBtn.click();
    fixture.detectChanges();

    const line1 = fixture.nativeElement.querySelector(
      'app-address-form input[formControlName="addressLine1"]'
    ) as HTMLInputElement;
    line1.value = 'Calle Los Álamos 500';
    line1.dispatchEvent(new Event('input'));
    const city = fixture.nativeElement.querySelector(
      'app-address-form input[formControlName="city"]'
    ) as HTMLInputElement;
    city.value = 'Valparaíso';
    city.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const form = fixture.nativeElement.querySelector('app-address-form form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    const create = httpMock.expectOne(`${environment.apiUrl}/api/addresses`);
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toEqual({ addressLine1: 'Calle Los Álamos 500', city: 'Valparaíso' });
    create.flush({ ...ADDRESS_2 });
    // Tras guardar, la página recarga la lista silenciosamente.
    httpMock.expectOne(`${environment.apiUrl}/api/addresses`).flush([ADDRESS_1, ADDRESS_2]);
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('.address-card');
    expect(cards.length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('Calle Los Álamos 500');
    // El form se cierra tras guardar (lista con direcciones + showForm false).
    expect(fixture.nativeElement.querySelector('app-address-form')).toBeNull();
  });

  it('pre-fills the form when editing an address', () => {
    flushAddresses([ADDRESS_1, ADDRESS_2]);

    const editBtn = Array.from(fixture.nativeElement.querySelectorAll('button')).find((b) =>
      (b as HTMLElement).textContent?.includes('Editar')
    ) as HTMLButtonElement;
    editBtn.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Editar dirección');
    const line1 = fixture.nativeElement.querySelector(
      'input[formControlName="addressLine1"]'
    ) as HTMLInputElement;
    expect(line1.value).toBe('Av. Providencia 1234');
  });

  it('shows the API error message when a delete fails', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    flushAddresses([ADDRESS_1]);

    (fixture.nativeElement.querySelector('.mini-btn.danger') as HTMLButtonElement).click();

    const del = httpMock.expectOne(`${environment.apiUrl}/api/addresses/addr-1`);
    del.flush({ message: 'No se pudo eliminar' }, { status: 400, statusText: 'Bad Request' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No se pudo eliminar');
  });
});
