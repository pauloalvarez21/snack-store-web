import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { mockApiInterceptor } from '../interceptors/mock-api.interceptor';
import { AuthService } from './auth.service';

describe('AuthService (mock API)', () => {
  beforeEach(() => {
    environment.useMockData = true;
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([mockApiInterceptor]))]
    });
  });

  afterEach(() => {
    environment.useMockData = false;
  });

  it('logs in with the demo account and stores token + user', async () => {
    const service = TestBed.inject(AuthService);
    await firstValueFrom(service.login({ email: 'demo@snackstore.local', password: 'Demo12345!' }));
    expect(service.isAuthenticated()).toBe(true);
    expect(service.token()).toBeTruthy();
    expect(service.user()?.firstName).toBe('Demo');
    expect(service.user()?.role).toBe('CUSTOMER');
  });

  it('rejects invalid credentials and keeps the session closed', async () => {
    const service = TestBed.inject(AuthService);
    let rejected = false;
    try {
      await firstValueFrom(service.login({ email: 'demo@snackstore.local', password: 'incorrecta' }));
    } catch {
      rejected = true;
    }
    expect(rejected).toBe(true);
    expect(service.isAuthenticated()).toBe(false);
  });

  it('registers a new user and then allows login', async () => {
    const service = TestBed.inject(AuthService);
    await firstValueFrom(
      service.register({
        email: 'nuevo@test.local',
        password: 'ClaveSegura123!',
        firstName: 'Nuevo',
        lastName: 'Usuario'
      })
    );
    await firstValueFrom(service.login({ email: 'nuevo@test.local', password: 'ClaveSegura123!' }));
    expect(service.isAuthenticated()).toBe(true);
    expect(service.user()?.email).toBe('nuevo@test.local');
  });

  it('rejects a duplicate registration email', async () => {
    const service = TestBed.inject(AuthService);
    let rejected = false;
    try {
      await firstValueFrom(
        service.register({
          email: 'demo@snackstore.local',
          password: 'OtraClave123!',
          firstName: 'Otro',
          lastName: 'Usuario'
        })
      );
    } catch {
      rejected = true;
    }
    expect(rejected).toBe(true);
  });
});
