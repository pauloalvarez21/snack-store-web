import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { User } from '../../core/models/user.model';
import { AuthService } from '../../core/services/auth.service';
import { ProfilePage } from './profile-page';

const USER: User = {
  id: 'u1',
  email: 'cliente@snack.store',
  firstName: 'Cliente',
  lastName: 'Demo',
  phone: '+56912345678',
  role: 'CUSTOMER'
};

describe('ProfilePage', () => {
  let fixture: ComponentFixture<ProfilePage>;
  let component: ProfilePage;
  let httpMock: HttpTestingController;
  let auth: AuthService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfilePage],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();
    fixture = TestBed.createComponent(ProfilePage);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  function flushProfile(user: User = USER): void {
    httpMock.expectOne(`${environment.apiUrl}/api/users/me`).flush(user);
    fixture.detectChanges();
  }

  function setInput(formControlName: string, value: string): void {
    const input = fixture.nativeElement.querySelector(
      `input[formControlName="${formControlName}"]`
    ) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function inputValue(formControlName: string): string {
    return (fixture.nativeElement.querySelector(
      `input[formControlName="${formControlName}"]`
    ) as HTMLInputElement).value;
  }

  it('loads and renders the profile with the form pre-filled', () => {
    flushProfile();

    expect(fixture.nativeElement.textContent).toContain('cliente@snack.store');
    expect(fixture.nativeElement.textContent).toContain('Cliente');
    const firstName = fixture.nativeElement.querySelector(
      'input[formControlName="firstName"]'
    ) as HTMLInputElement;
    expect(firstName.value).toBe('Cliente');
    expect(inputValue('phone')).toBe('+56912345678');
  });

  it('shows the error state and reloads on retry', () => {
    httpMock.expectOne(`${environment.apiUrl}/api/users/me`).flush(
      { message: 'Error' },
      { status: 500, statusText: 'Server Error' }
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No pudimos cargar tu perfil');

    (fixture.nativeElement.querySelector('.error-box button') as HTMLButtonElement).click();
    httpMock.expectOne(`${environment.apiUrl}/api/users/me`).flush(USER);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('cliente@snack.store');
  });

  it('updates the profile and refreshes the auth user in the header', () => {
    auth.user.set({ id: 'u1', email: 'cliente@snack.store', firstName: 'Cliente', lastName: 'Demo', role: 'CUSTOMER' });
    flushProfile();

    setInput('firstName', 'Ana');
    const form = fixture.nativeElement.querySelectorAll('form')[0] as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    const patch = httpMock.expectOne(`${environment.apiUrl}/api/users/me`);
    expect(patch.request.method).toBe('PATCH');
    expect(patch.request.body).toEqual({ firstName: 'Ana', lastName: 'Demo', phone: '+56912345678' });
    patch.flush({ ...USER, firstName: 'Ana' });
    fixture.detectChanges();

    expect(auth.user()?.firstName).toBe('Ana');
    expect(fixture.nativeElement.textContent).toContain('Tus datos se guardaron correctamente');
  });

  it('does not submit the profile when a name is only whitespace', () => {
    flushProfile();

    setInput('firstName', '   ');
    const form = fixture.nativeElement.querySelectorAll('form')[0] as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No puede contener solo espacios');
    // Sin llamada al backend mientras el formulario sea inválido.
    httpMock.expectNone(`${environment.apiUrl}/api/users/me`);
  });

  it('sends phone null when the field is cleared', () => {
    flushProfile();

    setInput('phone', '');
    const form = fixture.nativeElement.querySelectorAll('form')[0] as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    const patch = httpMock.expectOne(`${environment.apiUrl}/api/users/me`);
    expect(patch.request.body).toEqual({ firstName: 'Cliente', lastName: 'Demo', phone: null });
    patch.flush({ ...USER, phone: null });
  });

  it('shows the API error message when saving the profile fails', () => {
    flushProfile();

    setInput('lastName', 'Otro');
    const form = fixture.nativeElement.querySelectorAll('form')[0] as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    const patch = httpMock.expectOne(`${environment.apiUrl}/api/users/me`);
    patch.flush({ message: 'Nombre inválido' }, { status: 400, statusText: 'Bad Request' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Nombre inválido');
  });

  it('changes the password and resets the form', () => {
    flushProfile();

    setInput('currentPassword', 'Vieja123!');
    setInput('newPassword', 'Nueva123!');
    setInput('confirmPassword', 'Nueva123!');
    const form = fixture.nativeElement.querySelectorAll('form')[1] as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    const post = httpMock.expectOne(`${environment.apiUrl}/api/users/me/change-password`);
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual({ currentPassword: 'Vieja123!', newPassword: 'Nueva123!' });
    post.flush(null);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Tu contraseña se actualizó correctamente');
    expect(inputValue('currentPassword')).toBe('');
  });

  it('shows the API error message when changing the password fails', () => {
    flushProfile();

    setInput('currentPassword', 'Vieja123!');
    setInput('newPassword', 'Nueva123!');
    setInput('confirmPassword', 'Nueva123!');
    const form = fixture.nativeElement.querySelectorAll('form')[1] as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    const post = httpMock.expectOne(`${environment.apiUrl}/api/users/me/change-password`);
    post.flush({ message: 'La contraseña actual es incorrecta' }, { status: 400, statusText: 'Bad Request' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('La contraseña actual es incorrecta');
  });

  it('does not submit the password when the confirmation does not match', () => {
    flushProfile();

    setInput('currentPassword', 'Vieja123!');
    setInput('newPassword', 'Nueva123!');
    setInput('confirmPassword', 'Otra123!');
    const form = fixture.nativeElement.querySelectorAll('form')[1] as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Las contraseñas no coinciden');
    const submitBtn = fixture.nativeElement.querySelectorAll('form')[1].querySelector(
      'button[type="submit"]'
    ) as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);
    // Sin llamada al backend mientras el formulario sea inválido.
    httpMock.expectNone(`${environment.apiUrl}/api/users/me/change-password`);
  });
});
