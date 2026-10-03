'use client';

import { formatVolume, overloadDelta, summariseTraining } from '@gymsheet/domain';
import { Activity, CalendarDays, TrendingUp } from 'lucide-react';
import type { Workout } from '@/shared/api/contracts';

/** Las mismas cifras semanales que Inicio del móvil, calculadas sobre el historial. */
export function DashboardTrainingSummary({ workouts }: Readonly<{ workouts: readonly Workout[] }>) {
  const summary = summariseTraining(workouts);
  const delta = overloadDelta(summary);

  return (
    <section aria-label="Tu evolución" className="panel grid gap-5 p-5">
      <div>
        <h2 className="text-lg font-semibold">Tu evolución</h2>
        <p className="text-sm text-[var(--text-muted)]">Esta semana frente a la anterior.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="grid gap-2 rounded-[var(--radius-md)] bg-[var(--surface-low)] p-4">
          <span className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)]"><TrendingUp aria-hidden className="size-4" /> Carga esta semana</span>
          <span className="text-2xl font-semibold tabular-nums">{formatVolume(summary.thisWeek.volumeKg)}</span>
          <span className="text-xs text-[var(--text-muted)]">{delta ? `${delta.label} frente a la anterior` : 'Sin semana previa comparable'}</span>
        </div>
        <div className="grid gap-2 rounded-[var(--radius-md)] bg-[var(--surface-low)] p-4">
          <span className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)]"><Activity aria-hidden className="size-4" /> Racha semanal</span>
          <span className="text-2xl font-semibold tabular-nums">{summary.streakWeeks}</span>
          <span className="text-xs text-[var(--text-muted)]">Semanas con sesiones terminadas</span>
        </div>
        <div className="grid gap-2 rounded-[var(--radius-md)] bg-[var(--surface-low)] p-4">
          <span className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)]"><CalendarDays aria-hidden className="size-4" /> En 4 semanas</span>
          <span className="text-2xl font-semibold tabular-nums">{summary.recentSessions}</span>
          <span className="text-xs text-[var(--text-muted)]">Sesiones terminadas</span>
        </div>
      </div>
    </section>
  );
}
