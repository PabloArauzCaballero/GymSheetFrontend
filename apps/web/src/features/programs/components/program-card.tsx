import { Dumbbell, HeartPulse } from 'lucide-react';
import Link from 'next/link';
import type { CardioPlan, Program } from '@gymsheet/types';
import { Badge } from '@/shared/components/ui/badge';
import { hasMultiplier, modeLabel, multiplierLabel, nextMultiplierHint, programFraction, weekLabel } from '../labels';

/**
 * El programa activo en lo alto de Rutinas (RF-14): qué es, en qué semana va,
 * cuánto lleva de la semana y, si tiene modo, el multiplicador siempre a la
 * vista. Es un enlace al progreso del programa.
 */
export function ProgramCard({
  program,
  cardioPlan,
}: Readonly<{ program: Program; cardioPlan?: CardioPlan | null }>) {
  const isCardio = program.carril === 'CARDIO';
  const title = isCardio ? (cardioPlan?.nombre ?? 'Plan de cardio') : (program.rutinaNombre ?? 'Programa');
  const Icon = isCardio ? HeartPulse : Dumbbell;
  const fraction = programFraction(program);
  return (
    <Link
      className="panel hover-lift grid gap-4 p-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--volt)]"
      data-testid={`program-card-${isCardio ? 'cardio' : 'fuerza'}`}
      href={`/programs/${program.id}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="data-label inline-flex items-center gap-2 text-[var(--text-muted)]">
          <Icon aria-hidden className="size-4" />
          {isCardio ? 'Plan de cardio' : 'Programa de pesas'}
        </span>
        <Badge latido={false} tone={program.modo === 'NONE' ? 'neutral' : 'success'}>
          {modeLabel(program.modo)}
        </Badge>
        {program.esDescarga ? (
          <Badge latido={false} tone="warning">
            Descarga
          </Badge>
        ) : null}
        {hasMultiplier(program) ? (
          <span
            aria-label={`Multiplicador ${multiplierLabel(program.multiplicador)}`}
            className="ml-auto text-2xl font-semibold tracking-[-0.03em] text-[var(--accent-ink)]"
          >
            {multiplierLabel(program.multiplicador)}
          </span>
        ) : null}
      </div>
      <div className="grid gap-1">
        <h2 className="text-xl font-semibold tracking-[-0.02em]">{title}</h2>
        <p className="text-sm text-[var(--text-muted)]">
          {weekLabel(program)} · {program.sesionesHechasSemana} de {program.sesionesPlanSemana}{' '}
          {program.sesionesPlanSemana === 1 ? 'sesión' : 'sesiones'} esta semana
        </p>
      </div>
      <div
        aria-label={`Avance del programa: ${weekLabel(program)}`}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={Math.round(fraction * 100)}
        className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-high)]"
        role="progressbar"
      >
        <div
          className="h-full rounded-full bg-[var(--volt)] transition-[width] duration-[var(--dur-4)]"
          style={{ width: `${Math.round(fraction * 100)}%` }}
        />
      </div>
      {hasMultiplier(program) ? (
        <p className="text-xs text-[var(--text-muted)]">{nextMultiplierHint(program)}</p>
      ) : null}
    </Link>
  );
}
