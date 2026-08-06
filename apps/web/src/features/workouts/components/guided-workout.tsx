'use client';

import { CheckCircle2, ChevronRight, Dumbbell, Timer } from 'lucide-react';
import { useState } from 'react';
import type { Workout } from '@/shared/api/contracts';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { formatNumber } from '@/shared/lib/numbers';
import { RestTimer } from './rest-timer';
import { SetEntryForm } from './set-entry-form';

/**
 * Focused "one exercise at a time" runner. Once a session is in progress the only
 * moves are: log a set (register the training), start rest, advance to the next
 * queued exercise, or finish. The queue is the session's ordered exercises —
 * pre-loaded when the session was started from a routine/plan.
 */
export function GuidedWorkout({
  workout,
  onFinish,
  finishing,
}: Readonly<{ workout: Workout; onFinish: () => void; finishing: boolean }>) {
  const exercises = workout.ejercicios;
  const [index, setIndex] = useState(0);
  const [resting, setResting] = useState(false);
  const position = Math.min(index, Math.max(0, exercises.length - 1));
  const current = exercises[position];
  const isLast = position >= exercises.length - 1;

  if (!current) {
    return (
      <div className="panel grid min-h-52 place-items-center p-8 text-center">
        <div>
          <Dumbbell className="mx-auto size-10 text-[var(--text-disabled)]" />
          <h2 className="mt-4 text-xl font-bold">Sin ejercicios en cola</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Esta sesión no tiene ejercicios programados. Termina o agrégalos desde el modo clásico.
          </p>
          <Button className="mt-5" loading={finishing} onClick={onFinish} variant="primary">
            <CheckCircle2 className="size-4" />
            Terminar entreno
          </Button>
        </div>
      </div>
    );
  }

  const completedSets = current.series.length;
  const volume = current.series.reduce((sum, set) => sum + set.pesoKg * set.repeticiones, 0);

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between gap-3">
        <span className="data-label shrink-0">
          Ejercicio {position + 1} de {exercises.length}
        </span>
        <div className="flex min-w-0 flex-wrap justify-end gap-1.5">
          {exercises.map((exercise, dotIndex) => (
            <span
              aria-hidden
              className={`h-1.5 rounded-full transition-all ${
                dotIndex === position
                  ? 'w-6 bg-[var(--volt)]'
                  : dotIndex < position
                    ? 'w-1.5 bg-[var(--volt-dim)]'
                    : 'w-1.5 bg-[var(--surface-highest)]'
              }`}
              key={exercise.id}
            />
          ))}
        </div>
      </div>

      <section className="panel animate-fade-in overflow-hidden">
        <div className="border-b border-[var(--border-subtle)] p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="data-label text-[var(--accent-ink)]">
                {current.ejercicio?.grupoMuscular ?? 'Ejercicio'}
              </p>
              <h2 className="mt-1 break-words text-2xl font-bold tracking-[-0.03em]">
                {current.ejercicio?.nombre ?? 'Ejercicio'}
              </h2>
              {current.nota ? (
                <p className="mt-2 text-sm text-[var(--text-muted)]">{current.nota}</p>
              ) : null}
            </div>
            <Badge tone={completedSets > 0 ? 'success' : 'neutral'}>
              {completedSets} {completedSets === 1 ? 'serie' : 'series'}
            </Badge>
          </div>
          {completedSets > 0 ? (
            <p className="mt-3 text-sm text-[var(--text-muted)]">
              Volumen del ejercicio: <span className="data-value">{formatNumber(volume)}</span> kg
            </p>
          ) : null}
        </div>

        {current.series.length ? (
          <ul className="divide-y divide-[var(--border-subtle)]">
            {current.series.map((set) => (
              <li className="flex items-center justify-between px-5 py-3 text-sm" key={set.id}>
                <span className="font-semibold">Serie {set.numeroSerie}</span>
                <span className="text-[var(--text-muted)]">
                  {formatNumber(set.pesoKg)} kg × {set.repeticiones} · RIR {set.rir}
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        <SetEntryForm
          nextSetNumber={completedSets + 1}
          sessionExerciseId={current.id}
          workoutId={workout.id}
        />
      </section>

      {resting ? <RestTimer /> : null}

      <div className="sticky bottom-4 z-10 flex flex-wrap gap-3 rounded-[10px] border border-[var(--border-subtle)] bg-[var(--header-bg)] p-3 backdrop-blur-lg">
        <Button
          className="flex-1"
          onClick={() => setResting((value) => !value)}
          variant={resting ? 'primary' : 'secondary'}
        >
          <Timer className="size-4" />
          {resting ? 'Ocultar descanso' : 'Descanso'}
        </Button>
        {isLast ? (
          <Button className="flex-1" loading={finishing} onClick={onFinish} variant="primary">
            <CheckCircle2 className="size-4" />
            Terminar entreno
          </Button>
        ) : (
          <Button
            className="flex-1"
            onClick={() => {
              setResting(false);
              setIndex(position + 1);
            }}
            variant="primary"
          >
            Siguiente ejercicio
            <ChevronRight className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
