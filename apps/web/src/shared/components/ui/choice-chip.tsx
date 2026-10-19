'use client';

import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';

/**
 * Opción seleccionable. Se lee como botón de dos estados (`aria-pressed`), y lo
 * seleccionado se distingue por relleno Y por el atributo: el color nunca es la
 * única pista. Alto mínimo de 44 px.
 */
export function ChoiceChip({
  selected,
  className,
  children,
  ...props
}: Readonly<
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-pressed'> & { selected: boolean }
>) {
  return (
    <button
      aria-pressed={selected}
      className={cn(
        'inline-flex min-h-11 min-w-11 items-center justify-center rounded-[var(--radius-md)] border px-4 text-sm font-semibold transition-[background-color,border-color,color,transform] duration-[var(--dur-1)] active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--volt)]',
        selected
          ? 'border-[var(--volt)] bg-[var(--volt)] text-[var(--accent-contrast)]'
          : 'border-[var(--border)] bg-[var(--surface-low)] text-[var(--text)] hover:bg-[var(--surface)]',
        className,
      )}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}
