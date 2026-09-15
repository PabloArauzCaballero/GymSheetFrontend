'use client';

import { Children, cloneElement, isValidElement, useId, type ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

/**
 * Etiqueta + control + error/pista, cableados entre sí.
 *
 * El `<label>` es HERMANO del control, no lo envuelve, así que la asociación
 * depende por completo de `htmlFor`/`id`. Cuando `htmlFor` era opcional y se
 * dejaba fuera —106 de 173 usos— el label no apuntaba a nada y el control se
 * anunciaba como «cuadro de edición», sin decir cuál. Y el `error` no se
 * anunciaba nunca: una validación fallida era silenciosa para quien no ve la
 * pantalla.
 *
 * Por eso el cableado se hace AQUÍ y no en cada llamada: `useId` genera el id,
 * y el control recibe `id`, `aria-describedby`, `aria-invalid` y el error se
 * anuncia con `role="alert"`. Un solo sitio arregla los 173 usos, y los que ya
 * pasan `htmlFor` o traen su propio `id`/`aria-label` se respetan tal cual.
 * Ver A-7 en hive/reports/qa-frontend.md.
 */
export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
  className,
}: Readonly<{
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}>) {
  const generatedId = useId();
  const errorId = `${generatedId}-error`;
  const hintId = `${generatedId}-hint`;

  // Sólo se cablea cuando hay exactamente un elemento hijo: con varios no se
  // puede saber cuál es el control, y sobrescribir el primero a ciegas sería
  // peor que no tocar nada.
  const only = Children.count(children) === 1 ? Children.only(children) : null;
  const isElement = only !== null && isValidElement(only);

  /**
   * Y tampoco se cablea cuando ese único hijo es una ETIQUETA HTML que no es un
   * control.
   *
   * Los campos con glifo envuelven el control en un `<div className="relative">`
   * para poder posicionar el icono. Al clonar a ciegas, el `id` acababa en ese
   * `div` —y el `<Input>` de dentro ya traía el suyo, el mismo—, así que el
   * documento tenía el id duplicado y `label[for]` resolvía al PRIMERO, el
   * `div`. Resultado: el buscador del Centro de ayuda y el de Ejercicios se
   * anunciaban sin nombre, con la etiqueta «Buscar» apuntando a una caja vacía.
   *
   * Con el envoltorio delante, el `id` lo pone el propio control —que es quien
   * debe llevarlo— y aquí basta con que la etiqueta apunte a `htmlFor`.
   */
  const childType = isElement ? (only as { type: unknown }).type : null;
  const isHtmlTag = typeof childType === 'string';
  const isFormControlTag =
    isHtmlTag && (childType === 'input' || childType === 'select' || childType === 'textarea');
  const canWire = isElement && (!isHtmlTag || isFormControlTag);

  const childProps = isElement ? (only.props as Record<string, unknown>) : {};
  // Un `id` propio del hijo manda: puede haber un `htmlFor` externo apuntándole.
  const controlId = (childProps.id as string | undefined) ?? htmlFor ?? generatedId;

  const describedBy =
    [
      childProps['aria-describedby'] as string | undefined,
      error ? errorId : null,
      !error && hint ? hintId : null,
    ]
      .filter(Boolean)
      .join(' ') || undefined;

  const control =
    canWire && !childProps['aria-label'] && !childProps['aria-labelledby']
      ? cloneElement(only, {
          id: controlId,
          'aria-describedby': describedBy,
          'aria-invalid': error ? true : (childProps['aria-invalid'] as boolean | undefined),
        } as Record<string, unknown>)
      : children;

  return (
    <div className={cn('grid gap-2', className)}>
      <label className="data-label" htmlFor={controlId}>
        {label}
      </label>
      {control}
      {error ? (
        <p className="text-sm text-[var(--danger-text)]" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
      {!error && hint ? (
        <p className="text-xs leading-5 text-[var(--text-muted)]" id={hintId}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
