import { Copy, Star } from 'lucide-react';
import Link from 'next/link';
import type { RoutineCard as RoutineCardData } from '@gymsheet/types';
import { Badge } from '@/shared/components/ui/badge';
import {
  daysPerWeekLabel,
  durationLabel,
  exerciseCountLabel,
  goalLabel,
  ratingLabel,
  visibilityLabel,
} from '@/features/routines-v2/labels';
import { WeekDots } from './week-dots';

/**
 * Tarjeta del catálogo (RF-01): nombre, objetivo, días y duración, autor o sello
 * REPP, valoración, copias y la miniatura de la semana. Toda la tarjeta es el
 * enlace al detalle.
 */
export function RoutineCard({
  routine,
  showVisibility = false,
}: Readonly<{ routine: RoutineCardData; showVisibility?: boolean }>) {
  const meta = [
    goalLabel(routine.objetivo),
    daysPerWeekLabel(routine.diasPorSemana),
    durationLabel(routine.duracionSemanas),
  ].filter(Boolean);
  const author = routine.esMia ? 'Tuya' : routine.esOficial ? 'Equipo REPP' : routine.autor.nombre;
  return (
    <Link
      className="panel hover-lift group flex h-full flex-col gap-4 p-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--volt)]"
      href={`/routines/${routine.id}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        {routine.esOficial ? (
          <Badge latido={false} tone="info">
            REPP
          </Badge>
        ) : null}
        {showVisibility ? <Badge latido={false}>{visibilityLabel(routine.visibilidad)}</Badge> : null}
        <span className="ml-auto inline-flex items-center gap-1 text-sm text-[var(--text-muted)]">
          <Star aria-hidden className="size-4" />
          {ratingLabel(routine.valoracion.promedio, routine.valoracion.total)}
        </span>
      </div>
      <div className="grid gap-1.5">
        <h2 className="text-lg font-semibold leading-snug tracking-[-0.02em]">{routine.nombre}</h2>
        <p className="text-sm text-[var(--text-muted)]">{meta.join(' · ')}</p>
        {routine.atribucion ? (
          <p className="text-xs text-[var(--text-muted)]">
            Basada en «{routine.atribucion.routineName}» de {routine.atribucion.authorName}
          </p>
        ) : null}
      </div>
      <WeekDots days={routine.dias.map((day) => day.diaSemana)} />
      <div className="mt-auto flex items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-3 text-xs text-[var(--text-muted)]">
        <span className="min-w-0 truncate">
          {author} · {exerciseCountLabel(routine.ejerciciosTotal)}
        </span>
        <span className="inline-flex shrink-0 items-center gap-1">
          <Copy aria-hidden className="size-3.5" />
          {routine.copias} {routine.copias === 1 ? 'copia' : 'copias'}
        </span>
      </div>
    </Link>
  );
}
