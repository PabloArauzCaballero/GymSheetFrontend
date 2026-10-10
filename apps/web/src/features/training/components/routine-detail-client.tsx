'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Play, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { confirm, notify } from '@/shared/notifications';
import { isStaff } from '@gymsheet/domain';
import { trainingService } from '@/features/training/services/training-service';
import type { UserRole } from '@/shared/api/contracts';
import { queryKeys } from '@/shared/api/query-keys';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import {
  SkeletonList,
  SkeletonPageHeader,
  SkeletonScreen,
} from '@/shared/components/feedback/skeleton';
import { PageHeader } from '@/shared/components/layout/page-header';
import { Button } from '@/shared/components/ui/button';
import { Field } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import { AssignRoutineDialog } from './assign-routine-dialog';
import { ScheduleRoutine } from './schedule-routine';

export function RoutineDetailClient({ id, role }: Readonly<{ id: string; role: UserRole }>) {
  const staff = isStaff(role);
  const router = useRouter();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: queryKeys.routine(id), queryFn: () => trainingService.get(id) });
  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.routine(id) });

  const [exName, setExName] = useState('');

  const addExercise = useMutation({
    mutationFn: (order: number) =>
      trainingService.addExercise(id, { ejercicioNombre: exName.trim(), orden: order, seriesObjetivo: 3 }),
    onSuccess: async () => {
      await refresh();
      setExName('');
      notify.success('Ejercicio agregado.');
    },
    onError: (error: Error) => notify.error(error),
  });
  const removeExercise = useMutation({
    mutationFn: (routineExerciseId: string) => trainingService.removeExercise(routineExerciseId),
    onSuccess: async () => {
      await refresh();
      notify.success('Ejercicio quitado.');
    },
    onError: (error: Error) => notify.error(error),
  });
  const start = useMutation({
    mutationFn: () => trainingService.start(id),
    onSuccess: (workout) => {
      notify.success('Sesión iniciada desde la rutina.');
      router.push(`/workouts/${workout.id}`);
    },
    onError: (error: Error) => notify.error(error),
  });
  if (query.isLoading) {
    return (
      <SkeletonScreen className="gap-8" label="Cargando la rutina">
        <SkeletonPageHeader withActions />
        <SkeletonList rows={6} variant="stacked" withAvatar={false} />
      </SkeletonScreen>
    );
  }
  if (query.isError || !query.data)
    return <ErrorPanel message={query.error?.message ?? 'Rutina no encontrada.'} onRetry={() => query.refetch()} />;

  const routine = query.data;
  const nextOrder = Math.max(0, ...routine.ejercicios.map((item) => item.orden)) + 1;
  const owner = routine.creadoPorUsuarioId;

  return (
    <div className="grid gap-8">
      <PageHeader
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={routine.ejercicios.length === 0}
              loading={start.isPending}
              onClick={() => start.mutate()}
              variant="primary"
            >
              <Play className="size-4" />
              Empezar entreno
            </Button>
            {staff ? <AssignRoutineDialog routineId={id} /> : null}
          </div>
        }
        description={routine.descripcion ?? 'Sin descripción.'}
        eyebrow={`${routine.visibilidad} · ${routine.objetivo ?? 'objetivo libre'}`}
        title={routine.nombre}
      />

      <ScheduleRoutine routineId={id} />

      <section className="panel overflow-hidden">
        <div className="border-b border-[var(--border-subtle)] p-5">
          <h2 className="text-lg font-semibold">Ejercicios ({routine.ejercicios.length})</h2>
        </div>
        {routine.ejercicios.length ? (
          <ul className="divide-y divide-[var(--border-subtle)]">
            {routine.ejercicios.map((item) => (
              <li className="flex items-center gap-4 p-4" key={item.id}>
                <span className="grid size-8 shrink-0 place-items-center rounded-[6px] border border-[var(--border-subtle)] text-sm font-semibold text-[var(--accent-ink)]">
                  {item.orden}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{item.ejercicio?.nombre ?? 'Ejercicio'}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {item.seriesObjetivo} series
                    {item.repsMin ? ` · ${item.repsMin}-${item.repsMax ?? item.repsMin} reps` : ''}
                    {item.descansoSeg ? ` · ${item.descansoSeg}s descanso` : ''}
                  </p>
                </div>
                <Button
                  aria-label="Quitar ejercicio"
                  loading={removeExercise.isPending}
                  onClick={async () => {
                    const result = await confirm({
                      title: 'Quitar ejercicio',
                      message: `Se quitará «${item.ejercicio?.nombre ?? 'Ejercicio'}» de la rutina.`,
                      severity: 'danger',
                      confirmLabel: 'Quitar',
                    });
                    if (result.confirmed) removeExercise.mutate(item.id);
                  }}
                  size="icon"
                  variant="ghost"
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="p-5 text-sm text-[var(--text-muted)]">Aún no hay ejercicios en esta rutina.</p>
        )}
        <form
          className="flex flex-wrap items-end gap-3 border-t border-[var(--border-subtle)] bg-[var(--surface-lowest)] p-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (exName.trim().length >= 2) addExercise.mutate(nextOrder);
          }}
        >
          <Field className="flex-1" htmlFor="exercise-name" label="Agregar ejercicio (por nombre)">
            <Input
              id="exercise-name"
              list="routine-owner"
              onChange={(event) => setExName(event.target.value)}
              placeholder="Ej. Press banca"
              value={exName}
            />
          </Field>
          <Button loading={addExercise.isPending} type="submit" variant="secondary">
            Agregar
          </Button>
        </form>
      </section>

      <p className="break-all text-xs text-[var(--text-disabled)]">Rutina de {owner}</p>
    </div>
  );
}
