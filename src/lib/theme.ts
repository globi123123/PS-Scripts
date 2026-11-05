import { useCallback, useSyncExternalStore } from 'react';

export type Theme = 'dark' | 'light';

/** Keep in sync with the inline script in index.html. */
const STORAGE_KEY = 'ps-scripts:theme';
const THEME_EVENT = 'ps-scripts:theme';
const THEME_COLORS: Record<Theme, string> = { dark: '#1c1b19', light: '#faf9f5' };

function readTheme(): Theme {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

function subscribe(onChange: () => void): () => void {
  // Follow theme changes made in other tabs.
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY && (event.newValue === 'light' || event.newValue === 'dark')) {
      applyTheme(event.newValue, { persist: false });
    }
  };
  window.addEventListener(THEME_EVENT, onChange);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(THEME_EVENT, onChange);
    window.removeEventListener('storage', onStorage);
  };
}

export function applyTheme(theme: Theme, options: { persist?: boolean } = {}): void {
  const root = document.documentElement;

  // Switch all colours at once instead of animating every element.
  root.classList.add('theme-switching');
  root.setAttribute('data-theme', theme);
  root.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[theme]);
  window.getComputedStyle(root).getPropertyValue('color');
  window.requestAnimationFrame(() => root.classList.remove('theme-switching'));

  if (options.persist !== false) {
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Storage can be unavailable (private mode, blocked cookies).
    }
  }
  window.dispatchEvent(new Event(THEME_EVENT));
}

export function useTheme(): { theme: Theme; toggleTheme: () => void } {
  const theme = useSyncExternalStore(subscribe, readTheme, (): Theme => 'dark');
  const toggleTheme = useCallback(() => applyTheme(readTheme() === 'dark' ? 'light' : 'dark'), []);
  return { theme, toggleTheme };
}
