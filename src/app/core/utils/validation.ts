import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Mensaje de error de un control, en el orden de precedencia de validadores.
 * Devuelve `null` si el control no tiene errores o no ha sido tocado/ensuciado
 * (así el mensaje solo aparece después de interactuar con el campo).
 */
export function fieldError(control: AbstractControl | null | undefined): string | null {
  if (!control?.errors || (!control.touched && !control.dirty)) return null;
  if (control.errors['required']) return 'Este campo es obligatorio.';
  if (control.errors['blank']) return 'No puede contener solo espacios.';
  if (control.errors['email']) return 'Ingresa un email válido.';
  if (control.errors['minlength']) {
    return `Mínimo ${control.errors['minlength'].requiredLength} caracteres.`;
  }
  return null;
}

/**
 * Valida a nivel de grupo que 'newPassword' y 'confirmPassword' coincidan
 * (para formularios de cambio de contraseña).
 */
export const matchingPasswords: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const password = group.get('newPassword')?.value;
  const confirm = group.get('confirmPassword')?.value;
  if (password && confirm && password !== confirm) {
    return { mismatch: true };
  }
  return null;
};

/**
 * Rechaza cadenas vacías o que solo contienen espacios en blanco
 * (un nombre como "   " no debe pasar como si estuviera completo).
 */
export const notBlank: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = control.value;
  if (value == null || (typeof value === 'string' && value.trim().length === 0)) {
    return { blank: true };
  }
  return null;
};
