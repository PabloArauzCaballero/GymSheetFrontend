import { Layers, Share2, Star, UserRound } from 'lucide-react';
import type { Routine } from '@gymsheet/types';
import { Badge } from '@/shared/components/ui/badge';
import {
  daysPerWeekLabel,
  durationLabel,
  goalLabel,
  ratingLabel,
  visibilityLabel,
} from '@/features/routines-v2/labels';

/** Etiquetas del encabezado: REPP, visibilidad y si la moderación la ocultó. */
export function RoutineBadges({ routine }: Readonly<{ routine: Routine }>) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {routine.esOficial ? (
        <Badge latido={false} tone="info">
          Recomendada por REPP
        </Badge>
      ) : null}
      <Badge latido={false}>{visibilidad(routine)}</Badge>
      {routine.estadoModeracion !== 'VISIBLE' ? (
        <Badge latido={false} tone="danger">
          Oculta por moderación
        </Badge>
      ) : null}
    </div>
  );
}

function visibilidad(routine: Routine) {
  return visibilityLabel(routine.visibilidad);
}

/** «Basada en X de @autor»: la franja de atribución de una copia (RF-10). */
export function AttributionStrip({ routine }: Readonly<{ routine: Routine }>) {
  if (!routine.atribucion) return null;
  return (
    <p
      className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-low)] px-4 py-3 text-sm text-[var(--text-muted)]"
      data-testid="attribution-strip"
    >
      <Layers aria-hidden className="size-4 shrink-0" />
      <span>
        Basada en <strong className="text-[var(--text)]">{routine.atribucion.routineName}</strong> de{' '}
        {routine.atribucion.authorName}
      </span>
    </p>
  );
}

/** La ficha de datos de la rutina, a un lado del calendario. */
export function AboutCard({ routine }: Readonly<{ routine: Routine }>) {
  const rows: Array<[string, string]> = [
    ['Objetivo', goalLabel(routine.objetivo)],
    ['Días', daysPerWeekLabel(routine.dias.length)],
    ['Duración', durationLabel(routine.duracionSemanas) ?? 'Sin duración fija'],
    ['Versión', `v${routine.version}`],
    ['Copias', String(routine.copias)],
  ];
  return (
    <section aria-labelledby="about-title" className="panel p-5">
      <h2 className="text-lg font-semibold tracking-[-0.02em]" id="about-title">
        Detalles
      </h2>
      <dl className="mt-4 grid gap-3 text-sm">
        {rows.map(([term, value]) => (
          <div className="flex items-baseline justify-between gap-4" key={term}>
            <dt className="text-[var(--text-muted)]">{term}</dt>
            <dd className="text-right font-semibold">{value}</dd>
          </div>
        ))}
        <div className="flex items-baseline justify-between gap-4">
          <dt className="inline-flex items-center gap-1.5 text-[var(--text-muted)]">
            <Star aria-hidden className="size-4" />
            Valoración
          </dt>
          <dd className="text-right font-semibold">
            {ratingLabel(routine.valoracion.promedio, routine.valoracion.total)}
          </dd>
        </div>
      </dl>
      <p className="mt-4 flex items-center gap-2 text-xs text-[var(--text-muted)]">
        {routine.esMia ? <Share2 aria-hidden className="size-3.5" /> : <UserRound aria-hidden className="size-3.5" />}
        {routine.esMia ? 'Es tuya' : routine.esOficial ? 'Rutina oficial de REPP' : routine.visibilidad === 'PUBLIC' ? 'Rutina pública' : 'Compartida contigo'}
      </p>
    </section>
  );
}
