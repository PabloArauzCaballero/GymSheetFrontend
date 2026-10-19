'use client';

import { Check, Dumbbell, Plus } from 'lucide-react';
import type { ReactNode } from 'react';
import { selectExercisePoster } from '@gymsheet/domain';
import type { Exercise } from '@/shared/api/contracts';
import { DomainImage } from '@/shared/components/media/domain-image';
import { cn } from '@/shared/lib/cn';

/**
 * Botón «+» de una fila del selector. Al añadir pasa a «✓ Añadido» y vuelve a
 * quitar el ejercicio: el estado se lee por el texto y el icono, no solo por el
 * color. Área táctil de 44 px como mínimo.
 */
export function PickToggle({
  added,
  name,
  onToggle,
}: Readonly<{ added: boolean; name: string; onToggle: () => void }>) {
  return (
    <button
      aria-label={added ? `Quitar ${name} de la rutina. Añadido` : `Añadir ${name}`}
      aria-pressed={added}
      className={cn(
        'inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-full border px-3 text-sm font-semibold transition-[background-color,color,transform] active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--volt)]',
        added
          ? 'border-[var(--volt)] bg-[var(--volt)] text-[var(--accent-contrast)]'
          : 'border-[var(--volt)] text-[var(--accent-ink)] hover:bg-[var(--surface)]',
      )}
      data-testid="pick-toggle"
      onClick={onToggle}
      type="button"
    >
      {added ? <Check aria-hidden className="size-4" /> : <Plus aria-hidden className="size-4" />}
      {added ? 'Añadido' : null}
    </button>
  );
}

/** Fila del selector: la miniatura y el nombre abren la ficha; el «+» añade. */
export function PickRow({
  exercise,
  added,
  onOpen,
  onToggle,
}: Readonly<{
  exercise: Exercise;
  added: boolean;
  onOpen: () => void;
  onToggle: () => void;
}>) {
  const poster = selectExercisePoster(exercise.media, null);
  const tag: ReactNode = exercise.targetMuscle ?? exercise.grupoMuscular;
  return (
    <li className="flex items-center gap-3 px-3 py-2">
      <button
        aria-label={`${exercise.nombre}. Abrir ficha`}
        className="flex min-h-14 min-w-0 flex-1 items-center gap-4 rounded-[var(--radius-md)] text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--volt)]"
        onClick={onOpen}
        type="button"
      >
        <span className="relative grid size-14 shrink-0 place-items-center overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-high)]">
          {poster ? (
            <DomainImage alt="" className="size-full bg-white object-cover" src={poster.url} />
          ) : (
            <Dumbbell aria-hidden className="size-5 text-[var(--text-disabled)]" />
          )}
        </span>
        <span className="grid min-w-0 gap-1">
          <span className="truncate font-semibold">{exercise.nombre}</span>
          <span className="truncate text-xs text-[var(--text-muted)]">{tag}</span>
        </span>
      </button>
      <PickToggle added={added} name={exercise.nombre} onToggle={onToggle} />
    </li>
  );
}
