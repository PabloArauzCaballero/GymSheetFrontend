'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Flame, MoreHorizontal, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { workoutService } from '@/features/workouts/services/workout-service';
import type { WorkoutExercise } from '@/shared/api/contracts';
import { queryKeys } from '@/shared/api/query-keys';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { SetEntryForm } from './set-entry-form';
import { WorkoutSetRow } from './workout-set-row';

export function WorkoutExercisePanel({
  workoutId,
  item,
  editable,
}: Readonly<{ workoutId: string; item: WorkoutExercise; editable: boolean }>) {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.workout(workoutId) });
  const toggleEmphasis = useMutation({
    mutationFn: () => workoutService.updateExercise(item.id, { esEnfasis: !item.esEnfasis }),
    onSuccess: async () => {
      await refresh();
      toast.success('Énfasis actualizado.');
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const remove = useMutation({
    mutationFn: () => workoutService.removeExercise(item.id),
    onSuccess: async () => {
      await refresh();
      toast.success('Ejercicio retirado.');
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const exercise = item.ejercicio;
  const volume = item.series.reduce((total, set) => total + set.pesoKg * set.repeticiones, 0);
  return (
    <article className="panel overflow-hidden transition-colors duration-200 hover:border-[var(--border)]">
      <header className="flex flex-col gap-4 border-b border-[var(--border-subtle)] bg-[var(--surface-lowest)] p-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap gap-2">
            <Badge>Orden {item.orden}</Badge>
            {item.esEnfasis ? (
              <Badge tone="success">
                <Flame className="mr-1 size-3" />
                Énfasis
              </Badge>
            ) : null}
          </div>
          <h2 className="mt-3 text-2xl font-bold tracking-[-0.03em]">
            {exercise?.nombre ?? 'Ejercicio no disponible'}
          </h2>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            {exercise?.grupoMuscular ?? 'Sin grupo'} · Volumen{' '}
            {Math.round(volume).toLocaleString('es-BO')} KG
          </p>
          {item.nota ? (
            <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">{item.nota}</p>
          ) : null}
        </div>
        {editable ? (
          <div className="flex gap-1">
            <Button
              aria-label="Alternar énfasis"
              aria-pressed={item.esEnfasis}
              className={item.esEnfasis ? 'text-[var(--accent-ink)]' : undefined}
              loading={toggleEmphasis.isPending}
              onClick={() => toggleEmphasis.mutate()}
              size="icon"
              variant="ghost"
            >
              <Flame
                className="size-4 transition-transform active:scale-125"
                fill={item.esEnfasis ? 'currentColor' : 'none'}
              />
            </Button>
            <Button
              aria-label="Eliminar ejercicio"
              loading={remove.isPending}
              onClick={() => remove.mutate()}
              size="icon"
              variant="ghost"
            >
              <Trash2 className="size-4" />
            </Button>
            <Button aria-label="Más acciones" disabled size="icon" variant="ghost">
              <MoreHorizontal className="size-4" />
            </Button>
          </div>
        ) : null}
      </header>
      <div className="grid grid-cols-[44px_repeat(3,minmax(70px,1fr))_92px] gap-2 bg-[var(--surface-low)] px-3 py-3 text-center text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
        <span>Set</span>
        <span>KG</span>
        <span>Reps</span>
        <span>RIR</span>
        <span />
      </div>
      {item.series.length ? (
        item.series.map((set) => (
          <WorkoutSetRow editable={editable} key={set.id} set={set} workoutId={workoutId} />
        ))
      ) : (
        <p className="border-t border-[var(--border-subtle)] p-5 text-center text-sm text-[var(--text-muted)]">
          Aún no se registraron series.
        </p>
      )}
      {editable ? (
        <SetEntryForm
          nextSetNumber={Math.max(0, ...item.series.map((set) => set.numeroSerie)) + 1}
          sessionExerciseId={item.id}
          workoutId={workoutId}
        />
      ) : null}
    </article>
  );
}
