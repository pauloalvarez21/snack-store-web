import { Injectable, computed, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark' | 'system';

/**
 * Maneja el tema claro/oscuro: sigue al sistema por defecto y permite
 * alternar manualmente. La preferencia se guarda en localStorage.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private static readonly STORAGE_KEY = 'snack_store_theme';

  private readonly media: MediaQueryList | null =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-color-scheme: dark)')
      : null;

  readonly theme = signal<ThemeMode>(this.load());

  readonly isDark = computed(() => {
    const mode = this.theme();
    if (mode === 'dark') return true;
    if (mode === 'light') return false;
    return this.media?.matches ?? false;
  });

  constructor() {
    this.apply();
    // Reacciona a cambios del sistema solo mientras no se haya forzado un tema.
    this.media?.addEventListener('change', () => {
      if (this.theme() === 'system') this.apply();
    });
  }

  setTheme(mode: ThemeMode): void {
    this.theme.set(mode);
    this.apply();
    this.persist();
  }

  /** Alterna claro ↔ oscuro (la primera vez sale del modo sistema). */
  toggle(): void {
    this.setTheme(this.isDark() ? 'light' : 'dark');
  }

  private apply(): void {
    const dark = this.isDark();
    document.documentElement.dataset['theme'] = dark ? 'dark' : 'light';
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  }

  private persist(): void {
    localStorage.setItem(ThemeService.STORAGE_KEY, this.theme());
  }

  private load(): ThemeMode {
    const stored = localStorage.getItem(ThemeService.STORAGE_KEY);
    return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
  }
}
