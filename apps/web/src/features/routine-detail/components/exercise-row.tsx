'use client';

import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { exerciseMetaLabel } from '@gymsheet/hooks';
import type { ExerciseLine } from '../view-model';
import { ExerciseCommunityDialog } from './exercise-community-dialog';

/** Resumen de una línea: «3 series · 8–12 reps · 60 kg · RIR 2» o «3 series · 30 s». */
function lineMeta(line: ExerciseLine): string {
  return exerciseMetaLabel({
    series: line.series,
    repsMin: line.repsMin,
    repsMax: line.repsMax,
    duracionSeg: line.duracionSeg,
    pesoObjetivoKg: line.pesoKg,
    rirObjetivo: line.rirObjetivo,
  });
}

/**
 * Un ejercicio de la hoja del día. `marca` es el número del ejercicio suelto o
 * su posición en el bloque («A1», «A2»).
 */
export function ExerciseRow({
  line,
  marca,
  isOwner,
  showCommunity,
}: Readonly<{ line: ExerciseLine; marca: string; isOwner: boolean; showCommunity: boolean }>) {
  const badge = (
    <span
      aria-hidden
      className="grid size-8 shrink-0 place-items-center rounded-[var(--radius-sm)] border border-[var(--border-subtle)] text-sm font-semibold text-[var(--accent-ink)]"
    >
      {marca}
    </span>
  );
  return (
    <li className="flex items-center" data-testid="exercise-row">
      {line.oculto ? (
        <div className="flex min-w-0 flex-1 items-center gap-4 p-4" data-testid="exercise-hidden">
          {badge}
          <span className="grid min-w-0 gap-0.5">
            <span className="font-semibold text-[var(--text-muted)]">Oculto por moderación</span>
            <span className="text-xs text-[var(--text-muted)]">{lineMeta({ ...line, nombre: '' })}</span>
          </span>
        </div>
      ) : (
        <Link
          className="flex min-w-0 flex-1 items-center gap-4 p-4 transition-colors duration-[var(--dur-1)] hover:bg-[var(--surface-low)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--volt)]"
          href={`/exercises/${line.ejercicioId}`}
        >
          {badge}
          <span className="grid min-w-0 flex-1 gap-0.5">
            <span className="truncate font-semibold">{line.nombre}</span>
            <span className="text-xs text-[var(--text-muted)]">{lineMeta(line)}</span>
          </span>
          <ChevronRight aria-hidden className="size-4 shrink-0 text-[var(--text-muted)]" />
          <span className="sr-only">Ver la ficha del ejercicio</span>
        </Link>
      )}
      {line.privado && !line.oculto && showCommunity ? (
        <div className="shrink-0 pr-3">
          <ExerciseCommunityDialog isOwner={isOwner} line={line} />
        </div>
      ) : null}
    </li>
  );
}
