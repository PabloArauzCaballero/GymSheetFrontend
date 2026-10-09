'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { Play } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import { isStaff } from '@gymsheet/domain';
import { ApiError } from '@/shared/api/api-error';
import { queryKeys } from '@/shared/api/query-keys';
import type { UserRole } from '@/shared/api/contracts';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { SkeletonList, SkeletonPageHeader, SkeletonScreen } from '@/shared/components/feedback/skeleton';
import { PageHeader } from '@/shared/components/layout/page-header';
import { Button } from '@/shared/components/ui/button';
import { replaceSearch } from '@/shared/lib/url-state';
import { notify } from '@/shared/notifications';
import { routineBuilderService } from '@/features/routine-wizard/services';
import { routineV2Keys } from '@/features/routines-v2/keys';
import { daysPerWeekLabel, durationLabel, goalLabel } from '@/features/routines-v2/labels';
import { AssignRoutineDialog } from '@/features/training/components/assign-routine-dialog';
import { trainingService } from '@/features/training/services/training-service';
import { buildWeeks, type DayModel } from '../view-model';
import { detailSearch, parseDetailView, type DetailView } from '../view-state';
import { CalendarSection } from './calendar-section';
import { AboutCard, AttributionStrip, RoutineBadges } from './detail-sections';
import { PendingInvitation } from './pending-invitation';

/**
 * Detalle de una rutina con la experiencia nueva (RF-02): cabecera, calendario
 * Semana / Mes y hoja del día. La comunidad, publicar, copiar y compartir
 * cuelgan de aquí (F4) y activar (F5).
 */
export function RoutineDetailV2({ id, role }: Readonly<{ id: string; role: UserRole }>) {
  const router = useRouter();
  const params = useSearchParams();
  const routine = useQuery({
    queryKey: queryKeys.routine(id),
    queryFn: () => routineBuilderService.get(id),
    retry: (count, error) => !(error instanceof ApiError && error.status < 500) && count < 2,
  });
  const calendar = useQuery({
    queryKey: routineV2Keys.calendar(id),
    queryFn: () => routineBuilderService.calendar(id),
    enabled: routine.isSuccess,
  });
  const weeks = useMemo(
    () => (routine.data ? buildWeeks(routine.data, calendar.data ?? null) : []),
    [routine.data, calendar.data],
  );
  const view = parseDetailView(params, weeks.length);
  const setView = useCallback(
    (patch: Partial<DetailView>) => replaceSearch(detailSearch({ ...view, ...patch })),
    [view],
  );
  const start = useMutation({
    mutationFn: (diaId?: string) => trainingService.start(id, diaId),
    onSuccess: (workout) => {
      notify.success('Sesión iniciada desde la rutina.');
      router.push(`/workouts/${workout.id}`);
    },
    onError: (error: Error) => notify.error(error),
  });

  if (routine.isLoading) {
    return (
      <SkeletonScreen className="gap-8" label="Cargando la rutina">
        <SkeletonPageHeader withActions />
        <SkeletonList rows={6} variant="stacked" withAvatar={false} />
      </SkeletonScreen>
    );
  }
  if (routine.error instanceof ApiError && routine.error.code === 'SHARE_PENDING') {
    return <PendingInvitation routineId={id} />;
  }
  if (routine.isError || !routine.data) {
    const hidden = routine.error instanceof ApiError && routine.error.code === 'CONTENT_HIDDEN';
    return (
      <ErrorPanel
        message={
          hidden
            ? 'Esta rutina está oculta mientras la moderación la revisa.'
            : (routine.error?.message ?? 'No encontramos esta rutina.')
        }
        onRetry={hidden ? undefined : () => void routine.refetch()}
      />
    );
  }

  const data = routine.data;
  const meta = [goalLabel(data.objetivo), daysPerWeekLabel(data.dias.length), durationLabel(data.duracionSemanas)]
    .filter(Boolean)
    .join(' · ');
  return (
    <div className="grid gap-8">
      <PageHeader
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={data.ejercicios.length === 0}
              loading={start.isPending && start.variables === undefined}
              onClick={() => start.mutate(undefined)}
              variant="secondary"
            >
              <Play aria-hidden className="size-4" />
              Empezar sesión
            </Button>
            {isStaff(role) ? <AssignRoutineDialog routineId={id} /> : null}
          </div>
        }
        description={data.descripcion ?? 'Sin descripción.'}
        eyebrow={meta}
        title={data.nombre}
      />
      <RoutineBadges routine={data} />
      <AttributionStrip routine={data} />

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid min-w-0 gap-6">
          <CalendarSection
            canStart={data.ejercicios.length > 0}
            onStartDay={(day: DayModel) => start.mutate(day.diaId)}
            onView={setView}
            startingDayId={start.isPending ? (start.variables ?? null) : null}
            view={view}
            weeks={weeks}
          />
        </div>
        <aside className="grid content-start gap-6">
          <AboutCard routine={data} />
        </aside>
      </div>
    </div>
  );
}
