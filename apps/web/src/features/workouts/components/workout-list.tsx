'use client';

import { useQuery } from '@tanstack/react-query';
import { CirclePlay, CirclePlus, FileJson, Flame, Sheet } from 'lucide-react';
import { useState } from 'react';
import { notify } from '@/shared/notifications';
import { workoutService } from '@/features/workouts/services/workout-service';
import { queryKeys } from '@/shared/api/query-keys';
import { EmptyState } from '@/shared/components/feedback/empty-state';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { Skeleton } from '@/shared/components/feedback/skeleton';
import { PageHeader } from '@/shared/components/layout/page-header';
import { Button, ButtonLink } from '@/shared/components/ui/button';
import { Pagination } from '@/shared/components/ui/pagination';
import { SessionRow } from './session-row';

export function WorkoutList() {
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState<'csv' | 'json' | null>(null);
  const query = useQuery({
    queryKey: queryKeys.workouts(page),
    queryFn: () => workoutService.list(page, 20),
  });
  async function exportHistory(type: 'csv' | 'json') {
    setExporting(type);
    try {
      await (type === 'csv' ? workoutService.exportCsv() : workoutService.exportJson());
      notify.success('Exportación preparada.');
    } catch (error: unknown) {
      notify.error(error instanceof Error ? error.message : 'No se pudo exportar.');
    } finally {
      setExporting(null);
    }
  }

  const inProgress = query.data?.items.find((item) => item.estado === 'EN_PROGRESO');

  return (
    // «Entrenos» del móvil (`app/(app)/workouts/index.tsx`): cabecera con el
    // total, las dos exportaciones en fantasma, UNA acción principal que cambia
    // con el contexto y la lista de sesiones.
    <div className="mx-auto grid w-full max-w-[560px] gap-6 lg:max-w-[760px]">
      <PageHeader
        description={
          query.data
            ? `${query.data.total} ${query.data.total === 1 ? 'sesión registrada' : 'sesiones registradas'}`
            : 'Tu historial.'
        }
        title="Entrenos"
        tutorialId="page:workouts"
      />

      <div className="grid grid-cols-2 gap-2" data-tutorial-id="workouts:export">
        <Button loading={exporting === 'json'} onClick={() => exportHistory('json')} size="sm" variant="ghost">
          <FileJson aria-hidden className="size-4" />
          {exporting === 'json' ? 'Generando…' : 'Datos en JSON'}
        </Button>
        <Button loading={exporting === 'csv'} onClick={() => exportHistory('csv')} size="sm" variant="ghost">
          <Sheet aria-hidden className="size-4" />
          {exporting === 'csv' ? 'Generando…' : 'Datos en CSV'}
        </Button>
      </div>

      <span className="grid" data-tutorial-id="workouts:new">
        {inProgress ? (
          <ButtonLink href={`/workouts/${inProgress.id}`} variant="primary">
            <CirclePlay aria-hidden className="size-5" />
            Continuar sesión en curso
          </ButtonLink>
        ) : (
          <ButtonLink href="/workouts/new" variant="primary">
            <CirclePlus aria-hidden className="size-5" />
            Empezar entrenamiento
          </ButtonLink>
        )}
      </span>

      {query.isLoading ? (
        <div className="grid gap-3">
          <Skeleton className="h-23 rounded-[var(--radius-xl)]" />
          <Skeleton className="h-23 rounded-[var(--radius-xl)]" />
          <Skeleton className="h-23 rounded-[var(--radius-xl)]" />
        </div>
      ) : query.isError ? (
        <ErrorPanel message={query.error.message} onRetry={() => query.refetch()} />
      ) : query.data?.items.length ? (
        <>
          <section aria-label="Sesiones" className="grid gap-3">
            {query.data.items.map((session) => (
              <SessionRow key={session.id} session={session} />
            ))}
          </section>
          <Pagination onPageChange={setPage} page={query.data.page} totalPages={query.data.totalPages} />
        </>
      ) : (
        <EmptyState
          description="Cuando registres una sesión, quedará aquí con sus series y cargas."
          icon={<Flame />}
          title="Todavía sin entrenos"
        />
      )}
    </div>
  );
}
