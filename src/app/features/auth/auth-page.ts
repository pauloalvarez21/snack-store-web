import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, of, switchMap } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';
import { fieldError, notBlank } from '../../core/utils/validation';

@Component({
  selector: 'app-auth-page',
  imports: [ReactiveFormsModule],
  templateUrl: './auth-page.html',
  styleUrl: './auth-page.scss'
})
export class AuthPage {
  private readonly auth = inject(AuthService);
  private readonly cart = inject(CartService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly mode = signal<'login' | 'register'>('login');
  protected readonly submitting = signal(false);
  protected readonly errorMsg = signal<string | null>(null);
  protected readonly showPassword = signal(false);

  protected readonly loginForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required])
  });

  protected readonly registerForm = new FormGroup({
    firstName: new FormControl('', [Validators.required, notBlank]),
    lastName: new FormControl('', [Validators.required, notBlank]),
    email: new FormControl('', [Validators.required, Validators.email]),
    phone: new FormControl(''),
    password: new FormControl('', [Validators.required, Validators.minLength(8)])
  });

  protected switchMode(mode: 'login' | 'register'): void {
    this.mode.set(mode);
    this.errorMsg.set(null);
  }

  protected onLogin(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }
    const { email, password } = this.loginForm.getRawValue();
    this.errorMsg.set(null);
    this.submitting.set(true);
    this.auth
      .login({ email: email!, password: password! })
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: () => this.redirectAfterAuth(),
        error: () => this.errorMsg.set('Credenciales inválidas. Revisa tu email y contraseña.')
      });
  }

  protected onRegister(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }
    const value = this.registerForm.getRawValue();
    this.errorMsg.set(null);
    this.submitting.set(true);
    this.auth
      .register({
        firstName: value.firstName!,
        lastName: value.lastName!,
        email: value.email!,
        password: value.password!,
        phone: value.phone || undefined
      })
      .pipe(
        // Si el registro ya autenticó, no hace falta login.
        switchMap(() => (this.auth.isAuthenticated() ? of(null) : this.auth.login({ email: value.email!, password: value.password! }))),
        finalize(() => this.submitting.set(false))
      )
      .subscribe({
        next: () => this.redirectAfterAuth(),
        error: (err) => this.errorMsg.set(this.registerError(err))
      });
  }

  protected errorFor(form: FormGroup, field: string): string | null {
    return fieldError(form.get(field));
  }

  private registerError(err: unknown): string {
    const status = (err as { status?: number }).status;
    if (status === 409) return 'Ese email ya está registrado. Intenta iniciar sesión.';
    return 'No pudimos crear tu cuenta. Inténtalo de nuevo.';
  }

  private redirectAfterAuth(): void {
    // Al autenticarse, el carrito pasa a ser el del servidor: lo recargamos.
    this.cart.refresh();
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/catalogo';
    this.router.navigateByUrl(returnUrl);
  }
}
