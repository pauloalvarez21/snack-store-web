import { TestBed } from '@angular/core/testing';

import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.removeItem('snack_store_theme');
    document.documentElement.dataset['theme'] = 'light';
  });

  afterEach(() => {
    localStorage.removeItem('snack_store_theme');
    document.documentElement.dataset['theme'] = 'light';
  });

  it('defaults to system mode', () => {
    const service = TestBed.inject(ThemeService);
    expect(service.theme()).toBe('system');
  });

  it('toggles to dark, applies the attribute and persists', () => {
    const service = TestBed.inject(ThemeService);
    service.toggle();
    expect(service.theme()).toBe('dark');
    expect(service.isDark()).toBe(true);
    expect(document.documentElement.dataset['theme']).toBe('dark');
    expect(localStorage.getItem('snack_store_theme')).toBe('dark');
  });

  it('toggles back to light', () => {
    const service = TestBed.inject(ThemeService);
    service.toggle();
    service.toggle();
    expect(service.theme()).toBe('light');
    expect(document.documentElement.dataset['theme']).toBe('light');
  });

  it('restores a saved preference', () => {
    localStorage.setItem('snack_store_theme', 'dark');
    const service = TestBed.inject(ThemeService);
    expect(service.theme()).toBe('dark');
    expect(service.isDark()).toBe(true);
  });
});
