import { AbstractControl } from '@angular/forms';

/**
 * Mensaje de error de un control, en el orden de precedencia de validadores.
 * Devuelve `null` si el control no tiene errores o no ha sido tocado/ensuciado
 * (así el mensaje solo aparece después de interactuar con el campo).
 */
export function fieldError(control: AbstractControl | null | undefined): string | null {
  if (!control?.errors || (!control.touched && !control.dirty)) return null;
  if (control.errors['required']) return 'Este campo es obligatorio.';
  if (control.errors['email']) return 'Ingresa un email válido.';
  if (control.errors['minlength']) {
    return `Mínimo ${control.errors['minlength'].requiredLength} caracteres.`;
  }
  return null;
}
