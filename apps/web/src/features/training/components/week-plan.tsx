'use client';

import { WEEKDAY_DISPLAY_ORDER, WEEKDAY_INITIAL, WEEKDAY_NAME, assignmentsForWeekday, shortRoutineName } from '@gymsheet/domain';
import { Moon } from 'lucide-react';
import type { RoutineAssignment } from '@/shared/api/contracts';

export function WeekPlan({ assignments, onPickRoutine }: Readonly<{
  assignments: readonly RoutineAssignment[];
  onPickRoutine: (routineId: string) => void;
}>) {
  const today = new Date().getDay();
  const todayPlans = assignmentsForWeekday(assignments, today);

  return (
    <section aria-label="Plan semanal" className="panel grid gap-4 p-5">
      <div>
        <h2 className="text-lg font-semibold">Tu semana</h2>
        <p className="text-sm text-[var(--text-muted)]">Toca un día para abrir su rutina.</p>
      </div>
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {WEEKDAY_DISPLAY_ORDER.map((day) => {
          const plans = assignmentsForWeekday(assignments, day);
          const first = plans.find((item) => item.rutina);
          return (
            <button
              aria-label={`${WEEKDAY_NAME[day]}: ${plans.length ? plans.map((item) => item.rutina?.nombre ?? 'rutina').join(', ') : 'descanso'}`}
              className={`grid min-h-20 min-w-0 content-center justify-items-center gap-2 rounded-[var(--radius-md)] border px-1 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-ink)] ${day === today ? 'border-[var(--accent-ink)]' : 'border-[var(--border-subtle)]'} ${plans.length ? 'bg-[var(--surface-low)] text-[var(--text)] hover:border-[var(--text-muted)]' : 'bg-[var(--surface-lowest)] text-[var(--text-muted)]'}`}
              disabled={!first}
              key={day}
              onClick={() => first?.rutina && onPickRoutine(first.rutina.id)}
              type="button"
            >
              <span className="text-xs font-semibold">{WEEKDAY_INITIAL[day]}</span>
              {plans.length ? <span aria-hidden className="text-xs tabular-nums">{plans.length} {plans.length === 1 ? 'rutina' : 'rutinas'}</span> : <Moon aria-hidden className="size-4" />}
            </button>
          );
        })}
      </div>
      <p className="text-sm text-[var(--text-muted)]">
        Hoy: {todayPlans.length ? todayPlans.map((item) => shortRoutineName(item.rutina?.nombre ?? 'Rutina')).join(', ') : 'descanso'}
      </p>
    </section>
  );
}
