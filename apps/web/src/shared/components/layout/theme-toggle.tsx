'use client';

import { Moon, Sun } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { useTheme } from '@/shared/theme/theme-provider';

/**
 * Alterna entre tema claro y oscuro. Antes de la hidratación el tema es 'dark'
 * (snapshot de servidor), por lo que muestra el icono de sol; tras montar,
 * useSyncExternalStore sincroniza el icono con el tema real sin parpadeo.
 */
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === 'light';
  const label = isLight ? 'Cambiar a tema oscuro' : 'Cambiar a tema claro';

  return (
    <Button aria-label={label} onClick={toggleTheme} size="icon" title={label} variant="ghost">
      <Sun className={isLight ? 'hidden size-4' : 'size-4'} />
      <Moon className={isLight ? 'size-4' : 'hidden size-4'} />
    </Button>
  );
}
