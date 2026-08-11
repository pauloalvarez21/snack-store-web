import { FormControl, FormGroup, Validators } from '@angular/forms';

import { fieldError, matchingPasswords, notBlank } from './validation';

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

describe('matchingPasswords', () => {
  function group(password: string, confirm: string): FormGroup {
    return new FormGroup({
      newPassword: new FormControl(password),
      confirmPassword: new FormControl(confirm)
    });
  }

  it('returns null when both passwords match', () => {
    expect(matchingPasswords(group('Nueva123!', 'Nueva123!'))).toBeNull();
  });

  it('returns a mismatch error when the passwords differ', () => {
    expect(matchingPasswords(group('Nueva123!', 'Otra123!'))).toEqual({ mismatch: true });
  });

  it('returns null while the fields are empty', () => {
    expect(matchingPasswords(group('', ''))).toBeNull();
  });
});

describe('notBlank', () => {
  it('returns null for a normal string', () => {
    expect(notBlank(new FormControl('Juan'))).toBeNull();
  });

  it('returns a blank error for whitespace-only strings', () => {
    expect(notBlank(new FormControl('   '))).toEqual({ blank: true });
  });

  it('returns a blank error for empty or null values', () => {
    expect(notBlank(new FormControl(''))).toEqual({ blank: true });
    expect(notBlank(new FormControl(null))).toEqual({ blank: true });
  });

  it('returns null for non-string values', () => {
    expect(notBlank(new FormControl(42))).toBeNull();
  });
});
