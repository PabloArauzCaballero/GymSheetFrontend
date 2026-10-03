'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { SCHEDULE_DURATIONS, WEEKDAY_DISPLAY_ORDER, WEEKDAY_INITIAL, WEEKDAY_NAME, buildRoutineSchedule, scheduleEndDate } from '@gymsheet/domain';
import { CalendarDays } from 'lucide-react';
import { useState } from 'react';
import { trainingService } from '@/features/training/services/training-service';
import { notify } from '@/shared/notifications';
import { Button } from '@/shared/components/ui/button';

export function ScheduleRoutine({ routineId }: Readonly<{ routineId: string }>) {
  const queryClient = useQueryClient();
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [durationDays, setDurationDays] = useState<number | null>(30);
  const schedule = useMutation({
    mutationFn: () => trainingService.schedule(routineId, buildRoutineSchedule(weekdays, durationDays)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['routines'] });
      notify.success('Rutina programada en tu semana.');
    },
    onError: (error: Error) => notify.error(error),
  });
  const endsOn = scheduleEndDate(durationDays);

  return (
    <section aria-label="Programar rutina" className="panel grid gap-5 p-5">
      <div className="flex items-center gap-3">
        <CalendarDays aria-hidden className="size-5 text-[var(--accent-ink)]" />
        <div>
          <h2 className="text-lg font-semibold">Programar en mi semana</h2>
          <p className="text-sm text-[var(--text-muted)]">Elige tus días y cuánto durará el plan.</p>
        </div>
      </div>
      <div className="grid gap-2">
        <p className="text-sm font-medium">¿Qué días?</p>
        <div aria-label="Días de entrenamiento" className="flex flex-wrap gap-2" role="group">
          {WEEKDAY_DISPLAY_ORDER.map((day) => (
            <button
              aria-label={WEEKDAY_NAME[day]}
              aria-pressed={weekdays.includes(day)}
              className={`size-11 rounded-full border text-sm font-semibold transition-colors motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-ink)] ${weekdays.includes(day) ? 'border-[var(--text)] bg-[var(--text)] text-[var(--background)]' : 'border-[var(--border)] bg-[var(--surface-low)] text-[var(--text-muted)] hover:text-[var(--text)]'}`}
              key={day}
              onClick={() => setWeekdays((current) => current.includes(day) ? current.filter((value) => value !== day) : [...current, day])}
              type="button"
            >
              {WEEKDAY_INITIAL[day]}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-2">
        <p className="text-sm font-medium">¿Durante cuánto?</p>
        <div aria-label="Duración" className="flex flex-wrap gap-2" role="group">
          {SCHEDULE_DURATIONS.map((duration) => (
            <button
              aria-pressed={durationDays === duration.days}
              className={`min-h-11 rounded-full border px-4 text-sm transition-colors motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-ink)] ${durationDays === duration.days ? 'border-[var(--text)] bg-[var(--text)] font-semibold text-[var(--background)]' : 'border-[var(--border)] bg-[var(--surface-low)] text-[var(--text-muted)] hover:text-[var(--text)]'}`}
              key={duration.label}
              onClick={() => setDurationDays(duration.days)}
              type="button"
            >
              {duration.label}
            </button>
          ))}
        </div>
      </div>
      <p className="text-sm text-[var(--text-muted)]">
        Termina: {endsOn ? new Intl.DateTimeFormat('es-BO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${endsOn}T12:00:00Z`)) : 'sin fecha de fin'}
      </p>
      <Button disabled={weekdays.length === 0} loading={schedule.isPending} onClick={() => schedule.mutate()} variant="primary">
        Guardar en mi semana
      </Button>
    </section>
  );
}
