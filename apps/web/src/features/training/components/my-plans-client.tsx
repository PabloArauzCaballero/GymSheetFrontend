'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { CalendarClock, Play } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { trainingService } from '@/features/training/services/training-service';
import { queryKeys } from '@/shared/api/query-keys';
import { EmptyState } from '@/shared/components/feedback/empty-state';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { LoadingPanel } from '@/shared/components/feedback/loading-panel';
import { PageHeader } from '@/shared/components/layout/page-header';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { formatDate } from '@/shared/lib/date';

const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export function MyPlansClient() {
  const router = useRouter();
  const query = useQuery({
    queryKey: queryKeys.routineAssignments,
    queryFn: trainingService.myAssignments,
  });
  const start = useMutation({
    mutationFn: (routineId: string) => trainingService.start(routineId),
    onSuccess: (workout) => {
      toast.success('Sesión iniciada desde tu plan.');
      router.push(`/workouts/${workout.id}`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (query.isLoading) return <LoadingPanel rows={5} />;
  if (query.isError)
    return <ErrorPanel message={query.error.message} onRetry={() => query.refetch()} />;
  const assignments = query.data ?? [];

  return (
    <div className="grid gap-8">
      <PageHeader
        description="Planes de entrenamiento que tu coach te asignó, con su programación."
        eyebrow="Programación"
        title="Mis planes"
      />
      {assignments.length ? (
        <section className="stagger grid gap-4">
          {assignments.map((assignment) => {
            const routine = assignment.rutina;
            const exercises = routine?.ejercicios.length ?? 0;
            return (
              <article className="panel hover-lift flex flex-col gap-4 p-5 sm:flex-row sm:items-center" key={assignment.id}>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold tracking-[-0.02em]">
                      {routine?.nombre ?? 'Rutina'}
                    </h2>
                    <Badge tone="info">{exercises} ejercicios</Badge>
                    {assignment.fechaProgramada ? (
                      <Badge tone="warning">
                        <CalendarClock className="mr-1 inline size-3" />
                        {formatDate(assignment.fechaProgramada)}
                      </Badge>
                    ) : null}
                  </div>
                  {assignment.diasSemana.length ? (
                    <p className="mt-2 text-sm text-[var(--text-muted)]">
                      Días: {assignment.diasSemana.map((day) => WEEKDAYS[day]).join(', ')}
                    </p>
                  ) : null}
                  {assignment.nota ? (
                    <p className="mt-1 text-sm text-[var(--text-muted)]">{assignment.nota}</p>
                  ) : null}
                </div>
                <Button
                  disabled={exercises === 0}
                  loading={start.isPending}
                  onClick={() => start.mutate(assignment.rutinaId)}
                  variant="primary"
                >
                  <Play className="size-4" />
                  Empezar
                </Button>
              </article>
            );
          })}
        </section>
      ) : (
        <EmptyState
          description="Cuando tu coach te asigne un plan, aparecerá aquí listo para iniciar."
          title="Sin planes asignados"
        />
      )}
    </div>
  );
}
