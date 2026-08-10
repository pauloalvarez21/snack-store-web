import { FormControl, Validators } from '@angular/forms';

import { fieldError } from './validation';

describe('fieldError', () => {
  it('returns null when the control has no errors', () => {
    const control = new FormControl('valor');
    control.markAsTouched();
    expect(fieldError(control)).toBeNull();
  });

  it('returns null when the control is invalid but untouched/dirty-free', () => {
    expect(fieldError(new FormControl('', [Validators.required]))).toBeNull();
  });

  it('returns the required message for a touched empty field', () => {
    const control = new FormControl('', [Validators.required]);
    control.markAsTouched();
    expect(fieldError(control)).toBe('Este campo es obligatorio.');
  });

  it('returns the email message for an invalid email', () => {
    const control = new FormControl('no-es-email', [Validators.email]);
    control.markAsTouched();
    expect(fieldError(control)).toBe('Ingresa un email válido.');
  });

  it('returns the min length message with the required length', () => {
    const control = new FormControl('abc', [Validators.minLength(8)]);
    control.markAsTouched();
    expect(fieldError(control)).toBe('Mínimo 8 caracteres.');
  });

  it('handles null/undefined controls', () => {
    expect(fieldError(null)).toBeNull();
    expect(fieldError(undefined)).toBeNull();
  });
});
