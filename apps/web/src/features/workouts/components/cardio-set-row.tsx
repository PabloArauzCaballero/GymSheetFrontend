'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Timer, Trash2 } from 'lucide-react';
import { confirmDelete, notify } from '@/shared/notifications';
import { workoutService } from '@/features/workouts/services/workout-service';
import type { WorkoutSet } from '@/shared/api/contracts';
import { queryKeys } from '@/shared/api/query-keys';
import { Button } from '@/shared/components/ui/button';
import { cardioSetLabel } from './cardio-set-label';

/** Fila de una serie de cardio dentro del detalle de una sesión. */
export function CardioSetRow({
  workoutId,
  set,
  editable,
}: Readonly<{ workoutId: string; set: WorkoutSet; editable: boolean }>) {
  const queryClient = useQueryClient();
  const remove = useMutation({
    mutationFn: () => workoutService.removeSet(set.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.workout(workoutId) });
      notify.success('Serie eliminada.');
    },
    onError: (error: Error) => notify.error(error),
  });
  return (
    <div className="flex items-center justify-between gap-3 border-t border-[var(--border-subtle)] px-4 py-4 text-sm">
      <span className="flex items-center gap-3">
        <Timer aria-hidden className="size-4 text-[var(--text-muted)]" />
        <span className="data-value">{cardioSetLabel(set)}</span>
      </span>
      {editable ? (
        <Button
          aria-label="Eliminar serie"
          loading={remove.isPending}
          onClick={async () => {
            const result = await confirmDelete({ entity: 'serie', name: `#${set.numeroSerie}` });
            if (result.confirmed) remove.mutate();
          }}
          size="icon"
          variant="ghost"
        >
          <Trash2 className="size-4" />
        </Button>
      ) : null}
    </div>
  );
}
