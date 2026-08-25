import { FormControl, FormGroup, Validators } from '@angular/forms';

import { fieldError, matchingPasswords, notBlank, strongPassword } from './validation';

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

  it('returns the strong password message for weak passwords', () => {
    const control = new FormControl('miclave123');
    control.setErrors({ strongPassword: { hasUpper: false, hasLower: true, hasNumber: true } });
    control.markAsTouched();
    expect(fieldError(control)).toBe('Debe tener mayúscula, minúscula y número.');
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

describe('strongPassword', () => {
  function ctrl(value: string): FormControl {
    return new FormControl(value);
  }

  it('returns null when the password meets all requirements', () => {
    expect(strongPassword(ctrl('MiClave123'))).toBeNull();
  });

  it('returns null when the field is empty (other validators handle required)', () => {
    expect(strongPassword(ctrl(''))).toBeNull();
  });

  it('returns null when the password is too short (minLength handles this)', () => {
    expect(strongPassword(ctrl('Ab1'))).toBeNull();
  });

  it('returns an error when missing uppercase', () => {
    const result = strongPassword(ctrl('miclave123'));
    expect(result).toEqual({ strongPassword: { hasUpper: false, hasLower: true, hasNumber: true } });
  });

  it('returns an error when missing lowercase', () => {
    const result = strongPassword(ctrl('MICLAVE123'));
    expect(result).toEqual({ strongPassword: { hasUpper: true, hasLower: false, hasNumber: true } });
  });

  it('returns an error when missing number', () => {
    const result = strongPassword(ctrl('MiClaveX'));
    expect(result).toEqual({ strongPassword: { hasUpper: true, hasLower: true, hasNumber: false } });
  });

  it('returns an error when missing uppercase and number', () => {
    const result = strongPassword(ctrl('miclavex'));
    expect(result).toEqual({ strongPassword: { hasUpper: false, hasLower: true, hasNumber: false } });
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
