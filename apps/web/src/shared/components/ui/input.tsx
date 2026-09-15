'use client';

import {
  forwardRef,
  useId,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

const fieldClasses =
  'h-11 w-full rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-low)] px-3 text-base text-[var(--text)] placeholder:text-[var(--text-disabled)] transition-[border-color,background-color,box-shadow] duration-[var(--dur-2)] hover:border-[var(--border)] focus:border-[var(--volt)] focus:bg-[var(--surface)] focus:shadow-[0_0_0_3px_rgb(var(--accent-channels)/0.14)] disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(fieldClasses, className)} {...props} />;
  },
);

/**
 * Campo con un glifo de cabecera dentro de la caja.
 *
 * El icono es **decorativo** y así se declara: la etiqueta de `<Field>` ya
 * nombra el campo, y un lector de pantalla que anunciara además «sobre» antes
 * de «Correo electrónico» estaría leyendo el adorno. Sirve para que el
 * formulario se recorra de un vistazo, que es cosa de la vista.
 *
 * El relleno izquierdo se sube a 2.6rem para dejarle sitio; el icono se
 * posiciona en vez de ir en un `flex` para que la caja siga siendo un `<input>`
 * suelto y `<Field>` pueda cablearle `id` y `aria-describedby` como a
 * cualquier otro.
 */
export const InputWithIcon = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { icon: ReactNode }
>(function InputWithIcon({ className, icon, ...props }, ref) {
  return (
    <span className="group relative block">
      <span
        aria-hidden
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-disabled)] transition-colors duration-[var(--dur-2)] group-focus-within:text-[var(--accent-ink)]"
      >
        {icon}
      </span>
      <input ref={ref} className={cn(fieldClasses, 'pl-[2.6rem]', className)} {...props} />
    </span>
  );
});

/**
 * Campo de contraseña con su propio interruptor de visibilidad.
 *
 * Sustituye a la casilla «Mostrar contraseña» que vivía debajo del campo. Dos
 * razones, y la segunda es la que importa:
 *
 * - Una casilla suelta bajo un campo se lee como una pregunta del formulario
 *   —algo que se responde y se envía— cuando en realidad es un control de la
 *   vista. El ojo dentro de la caja dice lo que hace y dónde actúa.
 * - En el alta hay **dos** campos de contraseña. Con la casilla, revelar la
 *   primera no revelaba la confirmación, así que quien no consigue que
 *   coincidan —el único motivo para querer verlas— seguía escribiendo a ciegas
 *   justo donde falla.
 *
 * Arranca siempre oculta. Revelar es una acción sobre este formulario y este
 * momento, no una preferencia: persistirlo dejaría la contraseña de alguien a
 * la vista en la siguiente visita sin que lo pidiera.
 */
export const PasswordInput = forwardRef<
  HTMLInputElement,
  Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
    icon?: ReactNode;
    showLabel: string;
    hideLabel: string;
  }
>(function PasswordInput({ className, icon, id, showLabel, hideLabel, ...props }, ref) {
  const [visible, setVisible] = useState(false);
  const generated = useId();
  // `<Field>` clona ESTE elemento —no el `<span>` que envuelve— y le pasa `id`,
  // `aria-describedby` y `aria-invalid`; de ahí que lleguen por `props` y haya
  // que reenviarlos al `<input>` real, que es el control que nombran.
  const inputId = id ?? generated;

  return (
    <span className="group relative block">
      {icon ? (
        <span
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-disabled)] transition-colors duration-[var(--dur-2)] group-focus-within:text-[var(--accent-ink)]"
        >
          {icon}
        </span>
      ) : null}
      <input
        ref={ref}
        className={cn(fieldClasses, 'pr-11', icon ? 'pl-[2.6rem]' : undefined, className)}
        id={inputId}
        type={visible ? 'text' : 'password'}
        {...props}
      />
      <button
        // `aria-pressed` y no un texto que cambie a secas: el botón es un
        // interruptor, y su estado debe anunciarse como tal.
        aria-controls={inputId}
        aria-label={visible ? hideLabel : showLabel}
        aria-pressed={visible}
        className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-[var(--radius-sm)] text-[var(--text-muted)] transition-colors duration-[var(--dur-2)] hover:bg-[var(--surface-high)] hover:text-[var(--text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--volt)]"
        onClick={() => setVisible((current) => !current)}
        // Fuera del recorrido de tabulación por teclado no: es alcanzable a
        // propósito. Lo que no debe hacer es enviar el formulario al pulsarlo,
        // que es lo que haría un `<button>` sin tipo dentro de un `<form>`.
        type="button"
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </span>
  );
});
