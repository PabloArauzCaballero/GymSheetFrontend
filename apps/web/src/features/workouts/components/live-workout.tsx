'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, Ban, CheckCircle2, Clock3, Dumbbell, Gauge, Weight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { CSSProperties } from 'react';
import { toast } from 'sonner';
import { workoutService } from '@/features/workouts/services/workout-service';
import { queryKeys } from '@/shared/api/query-keys';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { LoadingPanel } from '@/shared/components/feedback/loading-panel';
import { PageHeader } from '@/shared/components/layout/page-header';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { MetricCard } from '@/shared/components/ui/metric-card';
import { formatDateTime, formatDuration } from '@/shared/lib/date';
import { AddExerciseDialog } from './add-exercise-dialog';
import { RestTimer } from './rest-timer';
import { WorkoutExercisePanel } from './workout-exercise-panel';

export function LiveWorkout({ id }: Readonly<{ id: string }>) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.workout(id),
    queryFn: () => workoutService.get(id),
    refetchInterval: 60_000,
  });
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.workout(id) });
    await queryClient.invalidateQueries({ queryKey: ['workouts'] });
  };
  const finish = useMutation({
    mutationFn: () => workoutService.finish(id),
    onSuccess: async () => {
      await refresh();
      toast.success('Sesión finalizada.');
      router.refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const cancel = useMutation({
    mutationFn: () => workoutService.cancel(id),
    onSuccess: async () => {
      await refresh();
      toast.success('Sesión cancelada.');
      router.refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });
  if (query.isLoading) return <LoadingPanel rows={8} />;
  if (query.isError || !query.data)
    return (
      <ErrorPanel
        message={query.error?.message ?? 'Sesión no encontrada.'}
        onRetry={() => query.refetch()}
      />
    );
  const workout = query.data;
  const editable = workout.estado === 'EN_PROGRESO';
  const sets = workout.ejercicios.reduce((total, item) => total + item.series.length, 0);
  const volume = workout.ejercicios.reduce(
    (total, item) =>
      total + item.series.reduce((sum, set) => sum + set.pesoKg * set.repeticiones, 0),
    0,
  );
  const averageRir = sets
    ? workout.ejercicios.reduce(
        (total, item) => total + item.series.reduce((sum, set) => sum + set.rir, 0),
        0,
      ) / sets
    : 0;
  return (
    <div className="grid gap-8">
      <PageHeader
        actions={
          editable ? (
            <>
              <AddExerciseDialog
                nextOrder={Math.max(0, ...workout.ejercicios.map((item) => item.orden)) + 1}
                workoutId={workout.id}
              />
              <Button
                loading={finish.isPending}
                onClick={() => finish.mutate()}
                variant="secondary"
              >
                <CheckCircle2 className="size-4" />
                Finalizar
              </Button>
              <Button loading={cancel.isPending} onClick={() => cancel.mutate()} variant="danger">
                <Ban className="size-4" />
                Cancelar
              </Button>
            </>
          ) : (
            <Badge tone={workout.estado === 'FINALIZADA' ? 'success' : 'danger'}>
              {workout.estado}
            </Badge>
          )
        }
        description={`${formatDateTime(workout.fechaInicio)} · ${workout.observacion ?? 'Sin observación'}`}
        eyebrow={editable ? 'Sesión activa' : 'Sesión archivada'}
        title={editable ? 'Entrenamiento en vivo' : 'Detalle de entrenamiento'}
      />
      <section className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={<Clock3 className="size-5" />}
          label="Tiempo"
          value={formatDuration(workout.fechaInicio, workout.fechaFin)}
        />
        <MetricCard
          accent
          icon={<Weight className="size-5" />}
          label="Volumen"
          suffix="KG"
          value={Math.round(volume).toLocaleString('es-BO')}
        />
        <MetricCard icon={<Activity className="size-5" />} label="Series" value={sets} />
        <MetricCard
          icon={<Gauge className="size-5" />}
          label="RIR medio"
          value={averageRir.toFixed(1)}
        />
      </section>
      {editable ? <RestTimer /> : null}
      <section className="stagger grid gap-5">
        {workout.ejercicios.length ? (
          workout.ejercicios.map((item, position) => (
            <div key={item.id} style={{ '--i': position } as CSSProperties}>
              <WorkoutExercisePanel editable={editable} item={item} workoutId={workout.id} />
            </div>
          ))
        ) : (
          <div className="grid min-h-64 place-items-center rounded-[8px] border border-dashed border-[var(--border)] p-8 text-center">
            <div>
              <Dumbbell className="mx-auto size-10 text-[var(--text-disabled)]" />
              <h2 className="mt-4 text-xl font-bold">Sesión vacía</h2>
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                Agrega el primer ejercicio para comenzar a registrar series.
              </p>
              {editable ? (
                <div className="mt-5">
                  <AddExerciseDialog nextOrder={1} workoutId={workout.id} />
                </div>
              ) : null}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
