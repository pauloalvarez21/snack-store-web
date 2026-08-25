import { Component, inject, signal, type WritableSignal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';

import { UserRole } from '../../core/models/user.model';
import { AuthService } from '../../core/services/auth.service';
import { UsersService } from '../../core/services/users.service';
import { userRoleLabel } from '../../core/utils/format';
import { fieldError, matchingPasswords, notBlank, strongPassword } from '../../core/utils/validation';

@Component({
  selector: 'app-profile-page',
  imports: [ReactiveFormsModule],
  templateUrl: './profile-page.html',
  styleUrl: './profile-page.scss'
})
export class ProfilePage {
  private readonly users = inject(UsersService);
  private readonly auth = inject(AuthService);

  protected readonly loading = signal(true);
  protected readonly error = signal(false);

  protected readonly email = signal('');
  protected readonly role = signal<UserRole>('CUSTOMER');

  protected readonly savingProfile = signal(false);
  protected readonly profileSaved = signal(false);
  protected readonly profileError = signal<string | null>(null);

  protected readonly savingPassword = signal(false);
  protected readonly passwordSaved = signal(false);
  protected readonly passwordError = signal<string | null>(null);

  protected readonly userRoleLabel = userRoleLabel;

  protected readonly showCurrentPassword = signal(false);
  protected readonly showNewPassword = signal(false);
  protected readonly showConfirmPassword = signal(false);

  protected readonly profileForm = new FormGroup({
    firstName: new FormControl('', [Validators.required, notBlank]),
    lastName: new FormControl('', [Validators.required, notBlank]),
    phone: new FormControl('')
  });

  protected readonly passwordForm = new FormGroup(
    {
      currentPassword: new FormControl('', [Validators.required]),
      newPassword: new FormControl('', [Validators.required, Validators.minLength(8), strongPassword]),
      confirmPassword: new FormControl('', [Validators.required])
    },
    { validators: matchingPasswords }
  );

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.users.findMe().subscribe({
      next: (user) => {
        this.email.set(user.email);
        this.role.set(user.role);
        this.profileForm.reset({
          firstName: user.firstName ?? '',
          lastName: user.lastName ?? '',
          phone: user.phone ?? ''
        });
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      }
    });
  }

  protected saveProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }
    const value = this.profileForm.getRawValue();
    this.profileError.set(null);
    this.profileSaved.set(false);
    this.savingProfile.set(true);
    this.users
      .updateMe({
        firstName: value.firstName!.trim(),
        lastName: value.lastName!.trim(),
        phone: value.phone?.trim() || null
      })
      .pipe(finalize(() => this.savingProfile.set(false)))
      .subscribe({
        next: (user) => {
          // Refresca el perfil en el header (chip de usuario) sin recargar la página.
          const current = this.auth.user();
          if (current) {
            this.auth.user.set({
              ...current,
              firstName: user.firstName,
              lastName: user.lastName,
              phone: user.phone
            });
          }
          this.profileSaved.set(true);
          this.autoClear(this.profileSaved);
        },
        error: (err) => this.profileError.set(this.apiMessage(err, 'No se pudieron guardar tus datos.'))
      });
  }

  protected savePassword(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }
    const value = this.passwordForm.getRawValue();
    this.passwordError.set(null);
    this.passwordSaved.set(false);
    this.savingPassword.set(true);
    this.users
      .changePassword({
        currentPassword: value.currentPassword!,
        newPassword: value.newPassword!
      })
      .pipe(finalize(() => this.savingPassword.set(false)))
      .subscribe({
        next: () => {
          this.passwordForm.reset();
          this.passwordSaved.set(true);
          this.autoClear(this.passwordSaved);
        },
        error: (err) =>
          this.passwordError.set(this.apiMessage(err, 'No se pudo cambiar la contraseña. Verifica la contraseña actual.'))
      });
  }

  protected errorFor(form: FormGroup, field: string): string | null {
    return fieldError(form.get(field));
  }

  /** Error de coincidencia entre 'newPassword' y 'confirmPassword' (a nivel de grupo). */
  protected passwordMismatch(): boolean {
    const confirm = this.passwordForm.get('confirmPassword');
    return !!this.passwordForm.errors?.['mismatch'] && !!(confirm?.touched || confirm?.dirty);
  }

  private autoClear(target: WritableSignal<boolean>): void {
    setTimeout(() => target.set(false), 4000);
  }

  private apiMessage(err: unknown, fallback: string): string {
    const message = (err as { error?: { message?: string } }).error?.message;
    return message ?? fallback;
  }
}
