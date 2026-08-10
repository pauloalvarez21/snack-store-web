import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { environment } from '../../../environments/environment';
import { Address } from '../../core/models/address.model';
import { AddressForm } from './address-form';

const ADDRESS: Address = {
  id: 'addr-1',
  addressLine1: 'Av. Providencia 1234',
  addressLine2: 'Depto 501',
  city: 'Santiago',
  stateProvince: 'Región Metropolitana',
  postalCode: null,
  deliveryNotes: 'Llamar al llegar',
  isDefault: true,
  createdAt: '2026-01-01T00:00:00.000Z'
};

describe('AddressForm', () => {
  let fixture: ComponentFixture<AddressForm>;
  let component: AddressForm;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddressForm],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();
    fixture = TestBed.createComponent(AddressForm);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  function fill(controlName: string, value: string): void {
    const input = fixture.nativeElement.querySelector(
      `input[formControlName="${controlName}"]`
    ) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function submit(): void {
    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  it('renders the five address fields', () => {
    for (const name of ['addressLine1', 'addressLine2', 'city', 'stateProvince', 'deliveryNotes']) {
      expect(fixture.nativeElement.querySelector(`input[formControlName="${name}"]`)).toBeTruthy();
    }
  });

  it('marks required fields and does not call the API when the form is invalid', () => {
    const saved = vi.fn();
    component.saved.subscribe(saved);

    // El botón está deshabilitado mientras el form sea inválido.
    const btn = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);

    submit();

    const errors = fixture.nativeElement.querySelectorAll('.field-error');
    expect(errors.length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('Este campo es obligatorio');
    httpMock.expectNone(`${environment.apiUrl}/api/addresses`);
    expect(saved).not.toHaveBeenCalled();
  });

  it('creates an address on submit and emits it with the trimmed payload', () => {
    const saved = vi.fn();
    component.saved.subscribe(saved);

    fill('addressLine1', '  Av. Providencia 1234  ');
    fill('addressLine2', 'Depto 501');
    fill('city', 'Santiago');
    fill('stateProvince', 'Región Metropolitana');
    fill('deliveryNotes', ' Llamar al llegar ');
    submit();

    const req = httpMock.expectOne(`${environment.apiUrl}/api/addresses`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      addressLine1: 'Av. Providencia 1234',
      addressLine2: 'Depto 501',
      city: 'Santiago',
      stateProvince: 'Región Metropolitana',
      deliveryNotes: 'Llamar al llegar'
    });

    const created = { ...ADDRESS, id: 'addr-nueva' };
    req.flush(created);
    fixture.detectChanges();
    expect(saved).toHaveBeenCalledWith(created);
  });

  it('pre-fills the form and updates the address when editing', () => {
    fixture.componentRef.setInput('editing', ADDRESS);
    fixture.detectChanges();

    const line1 = fixture.nativeElement.querySelector(
      'input[formControlName="addressLine1"]'
    ) as HTMLInputElement;
    expect(line1.value).toBe('Av. Providencia 1234');

    fill('city', 'Valparaíso');
    submit();

    const req = httpMock.expectOne(`${environment.apiUrl}/api/addresses/addr-1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({
      addressLine1: 'Av. Providencia 1234',
      addressLine2: 'Depto 501',
      city: 'Valparaíso',
      stateProvince: 'Región Metropolitana',
      deliveryNotes: 'Llamar al llegar'
    });
    req.flush(ADDRESS);
  });

  it('switches the title between "Nueva dirección" and "Editar dirección"', () => {
    expect(fixture.nativeElement.textContent).toContain('Nueva dirección');

    fixture.componentRef.setInput('editing', ADDRESS);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Editar dirección');
  });

  it('clears the form when switching back to create mode (editing = null)', () => {
    fixture.componentRef.setInput('editing', ADDRESS);
    fixture.detectChanges();

    const line1 = fixture.nativeElement.querySelector(
      'input[formControlName="addressLine1"]'
    ) as HTMLInputElement;
    expect(line1.value).toBe('Av. Providencia 1234');

    fixture.componentRef.setInput('editing', null);
    fixture.detectChanges();
    expect(line1.value).toBe('');
  });

  it('shows the saving state and disables the button while the request is in flight', () => {
    fill('addressLine1', 'Av. Providencia 1234');
    fill('city', 'Santiago');
    submit();

    const btn = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(btn.textContent).toContain('Guardando');

    httpMock.expectOne(`${environment.apiUrl}/api/addresses`).flush({ ...ADDRESS });
  });

  it('shows the API error message when the request fails', () => {
    fill('addressLine1', 'Av. Providencia 1234');
    fill('city', 'Santiago');
    submit();

    const req = httpMock.expectOne(`${environment.apiUrl}/api/addresses`);
    req.flush({ message: 'La ciudad no existe' }, { status: 400, statusText: 'Bad Request' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('La ciudad no existe');
  });

  it('emits cancel when the cancel button is clicked', () => {
    fixture.componentRef.setInput('showCancel', true);
    fixture.detectChanges();

    const cancel = vi.fn();
    component.cancel.subscribe(cancel);
    (fixture.nativeElement.querySelector('.btn-ghost') as HTMLButtonElement).click();
    expect(cancel).toHaveBeenCalled();
  });

  it('hides the cancel button when showCancel is false', () => {
    expect(fixture.nativeElement.querySelector('.btn-ghost')).toBeNull();
  });

  it('applies the submitClass input to the submit button', () => {
    fixture.componentRef.setInput('submitClass', 'btn-secondary');
    fixture.detectChanges();

    const btn = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(btn.classList.contains('btn-secondary')).toBe(true);
  });
});
