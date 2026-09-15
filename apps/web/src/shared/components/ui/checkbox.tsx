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
    /*
     * El `input` nativo NO se esconde con `sr-only`: se superpone al cuadrado
     * dibujado, a su mismo tamaño, con `opacity-0`.
     *
     * `sr-only` lo dejaba en un punto de 1×1 px recortado y, al ser
     * `position: absolute` sin ancestro posicionado, se colocaba respecto a un
     * contenedor varios niveles más arriba: el control acababa lejos de su
     * propia casilla —en el alta, debajo del botón de enviar—. Quien pulsa la
     * etiqueta no lo notaba, pero el objetivo real de la casilla no estaba
     * donde se ve, así que el foco al tabular saltaba a otro punto de la página
     * y cualquier pulsación por coordenadas aterrizaba en el elemento
     * equivocado.
     *
     * Con la superposición, lo que se pulsa ES la casilla: el navegador sigue
     * dando el foco, el teclado y el anuncio de «casilla, marcada», y además
     * hay un objetivo táctil de verdad donde el ojo lo espera. La etiqueta
     * sigue alternándola por `htmlFor`.
     */
    <div className={cn('relative flex items-center', className)}>
      <input
        // `z-10` porque la marca de dentro lleva `opacity` y eso le crea su
        // propio contexto de apilado: sin subir el input, el SVG —invisible
        // mientras está sin marcar— se pintaba por encima y se comía la
        // pulsación sobre la casilla.
        className="peer absolute left-0 top-1/2 z-10 size-[22px] -translate-y-1/2 cursor-pointer opacity-0 disabled:cursor-not-allowed"
        id={inputId}
        type="checkbox"
        {...props}
      />
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
