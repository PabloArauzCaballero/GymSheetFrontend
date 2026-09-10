'use client';

import { useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

/**
 * Casilla de verificación con su etiqueta.
 *
 * El `input` nativo sigue ahí, sólo que invisible: es quien recibe el foco, el
 * que responde a la barra espaciadora y el que un lector de pantalla anuncia
 * como casilla con su estado. Lo que se dibuja es la etiqueta hermana. Un
 * `div` con `role="checkbox"` habría exigido reimplementar todo eso a mano, y
 * el resultado nunca es tan bueno como lo que el navegador ya trae.
 *
 * Las variantes van sobre la etiqueta y apuntan a sus hijos con selectores
 * explícitos, no sobre el cuadrado directamente: `peer-checked:` compila a
 * `.peer:checked ~ .destino`, que alcanza hermanos y no descendientes, así que
 * puesto en el `span` interior no haría absolutamente nada.
 */
export function Checkbox({
  label,
  className,
  id,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { label: ReactNode }) {
  const generated = useId();
  const inputId = id ?? generated;

  return (
    <div className={cn('flex items-center', className)}>
      <input className="peer sr-only" id={inputId} type="checkbox" {...props} />
      <label
        className={cn(
          'flex cursor-pointer select-none items-center gap-2 py-1 text-sm text-[var(--text-muted)]',
          // Relleno y borde del cuadrado al marcar.
          'peer-checked:[&>span]:border-[var(--volt)] peer-checked:[&>span]:bg-[var(--volt)]',
          // La marca se revela con escala: aparecer de golpe a tamaño final lee
          // como un parpadeo, no como un gesto.
          'peer-checked:[&_svg]:scale-100 peer-checked:[&_svg]:opacity-100',
          // El foco vive en el input real y sólo se dibuja cuando llega por
          // teclado, que es cuando hace falta verlo.
          'peer-focus-visible:[&>span]:ring-[3px] peer-focus-visible:[&>span]:ring-[rgb(var(--accent-channels)/0.35)]',
          'peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
        )}
        htmlFor={inputId}
      >
        <span
          aria-hidden
          className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-[6px] border border-[var(--border)] transition-[background-color,border-color] duration-[var(--dur-2)]"
        >
          <svg
            className="h-[13px] w-[13px] scale-50 opacity-0 transition-[opacity,transform] duration-[var(--dur-1)] ease-[var(--ease-out)]"
            fill="none"
            stroke="var(--accent-contrast)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3"
            viewBox="0 0 24 24"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </span>
        {label}
      </label>
    </div>
  );
}
