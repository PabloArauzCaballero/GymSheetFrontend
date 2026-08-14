'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Pencil, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { confirmDelete, notify } from '@/shared/notifications';
import { workoutService } from '@/features/workouts/services/workout-service';
import type { WorkoutSet } from '@/shared/api/contracts';
import { queryKeys } from '@/shared/api/query-keys';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { cn } from '@/shared/lib/cn';
import { SET_GRID_COLS } from './set-grid';

export function WorkoutSetRow({
  workoutId,
  set,
  editable,
}: Readonly<{ workoutId: string; set: WorkoutSet; editable: boolean }>) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState({
    pesoKg: set.pesoKg,
    repeticiones: set.repeticiones,
    rir: set.rir,
    descansoSegAnterior: set.descansoSegAnterior,
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.workout(workoutId) });
  const update = useMutation({
    mutationFn: () => workoutService.updateSet(set.id, values),
    onSuccess: async () => {
      await refresh();
      setEditing(false);
      notify.success('Serie actualizada.');
    },
    onError: (error: Error) => notify.error(error),
  });
  const remove = useMutation({
    mutationFn: () => workoutService.removeSet(set.id),
    onSuccess: async () => {
      await refresh();
      notify.success('Serie eliminada.');
    },
    onError: (error: Error) => notify.error(error),
  });
  if (editing) {
    return (
      <div className={cn(SET_GRID_COLS, 'border-t border-[var(--border-subtle)] p-3')}>
        <span className="data-value text-center text-[var(--accent-ink)]">{set.numeroSerie}</span>
        <Input
          aria-label="Peso en kg"
          className="text-center"
          min="0"
          onChange={(event) =>
            setValues((current) => ({ ...current, pesoKg: Number(event.target.value) }))
          }
          step="0.25"
          type="number"
          value={values.pesoKg}
        />
        <Input
          aria-label="Repeticiones"
          className="text-center"
          min="1"
          onChange={(event) =>
            setValues((current) => ({ ...current, repeticiones: Number(event.target.value) }))
          }
          type="number"
          value={values.repeticiones}
        />
        <Input
          aria-label="RIR"
          className="text-center"
          max="10"
          min="0"
          onChange={(event) =>
            setValues((current) => ({ ...current, rir: Number(event.target.value) }))
          }
          type="number"
          value={values.rir}
        />
        <div className="flex justify-end gap-1">
          <Button
            aria-label="Guardar"
            loading={update.isPending}
            onClick={() => update.mutate()}
            size="icon"
            variant="primary"
          >
            <Check className="size-4" />
          </Button>
          <Button
            aria-label="Cancelar"
            onClick={() => setEditing(false)}
            size="icon"
            variant="ghost"
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>
    );
  }
  return (
    <div
      className={cn(
        SET_GRID_COLS,
        'group border-t border-[var(--border-subtle)] px-3 py-4 text-center transition-colors duration-150 hover:bg-[var(--surface-low)]',
      )}
    >
      <span className="data-value grid size-7 place-items-center justify-self-center rounded-full border border-[var(--border-subtle)] text-[var(--accent-ink)] transition-colors group-hover:border-[var(--volt)]">
        {set.numeroSerie}
      </span>
      <span className="data-value">{set.pesoKg}</span>
      <span className="data-value">{set.repeticiones}</span>
      <span className="data-value">{set.rir}</span>
      <div className="flex justify-end gap-1 opacity-100 transition-opacity duration-150 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
        {editable ? (
          <>
            <Button
              aria-label="Editar serie"
              onClick={() => setEditing(true)}
              size="icon"
              variant="ghost"
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              aria-label="Eliminar serie"
              loading={remove.isPending}
              onClick={async () => {
                const result = await confirmDelete({
                  entity: 'serie',
                  name: `#${set.numeroSerie}`,
                });
                if (result.confirmed) remove.mutate();
              }}
              size="icon"
              variant="ghost"
            >
              <Trash2 className="size-4" />
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}
