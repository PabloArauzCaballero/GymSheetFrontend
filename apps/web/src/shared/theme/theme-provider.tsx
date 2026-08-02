'use client';

import { createContext, useCallback, useContext, useSyncExternalStore, type ReactNode } from 'react';
import { THEME_COOKIE, THEME_COOKIE_MAX_AGE } from './theme-script';

export type ThemeMode = 'light' | 'dark';

type ThemeContextValue = {
  theme: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
};

// `data-theme` en <html> es la fuente de verdad en runtime (lo fija el script
// anti-FOUC antes del primer pintado). Lo leemos con useSyncExternalStore para
// evitar setState en efectos y desajustes de hidratación: el servidor y la
// primera hidratación usan 'dark' y el cliente sincroniza tras montar.
const listeners = new Set<() => void>();

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

function getSnapshot(): ThemeMode {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

function getServerSnapshot(): ThemeMode {
  return 'dark';
}

function applyTheme(mode: ThemeMode): void {
  document.documentElement.dataset.theme = mode;
  document.cookie = `${THEME_COOKIE}=${mode}; path=/; max-age=${THEME_COOKIE_MAX_AGE}; samesite=lax`;
  for (const onChange of listeners) onChange();
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: Readonly<{ children: ReactNode }>) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const setTheme = useCallback((mode: ThemeMode) => applyTheme(mode), []);
  const toggleTheme = useCallback(
    () => applyTheme(getSnapshot() === 'light' ? 'dark' : 'light'),
    [],
  );

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme debe usarse dentro de <ThemeProvider>');
  return ctx;
}
