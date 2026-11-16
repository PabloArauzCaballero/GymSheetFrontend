'use client';

import { useQuery } from '@tanstack/react-query';
import { CirclePlay, CirclePlus, FileJson, FileText, Sheet } from 'lucide-react';
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

type ExportType = 'pdf' | 'csv' | 'json';
const EXPORTERS: Record<ExportType, () => Promise<string>> = {
  pdf: workoutService.exportPdf,
  csv: workoutService.exportCsv,
  json: workoutService.exportJson,
};

export function WorkoutList() {
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState<ExportType | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const query = useQuery({
    queryKey: queryKeys.workouts(page),
    queryFn: () => workoutService.list(page, 20),
  });
  async function exportHistory(type: ExportType) {
    if (exporting) return;
    setExporting(type);
    setExportError(null);
    try {
      const saved = await EXPORTERS[type]();
      notify.success(`Descargado como ${saved}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'No se pudo exportar.';
      setExportError(message);
      notify.error(message);
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

      {/* Como el móvil: el PDF es para enseñar al entrenador; CSV y JSON, para analizar. */}
      <div
        aria-busy={exporting !== null}
        className="grid grid-cols-2 gap-2 sm:grid-cols-3"
        data-tutorial-id="workouts:export"
      >
        <Button
          className="col-span-2 sm:col-span-1"
          disabled={exporting !== null}
          loading={exporting === 'pdf'}
          onClick={() => exportHistory('pdf')}
          size="sm"
          variant="ghost"
        >
          <FileText aria-hidden className="size-4" />
          {exporting === 'pdf' ? 'Generando…' : 'Avance en PDF'}
        </Button>
        <Button disabled={exporting !== null} loading={exporting === 'json'} onClick={() => exportHistory('json')} size="sm" variant="ghost">
          <FileJson aria-hidden className="size-4" />
          {exporting === 'json' ? 'Generando…' : 'Datos en JSON'}
        </Button>
        <Button disabled={exporting !== null} loading={exporting === 'csv'} onClick={() => exportHistory('csv')} size="sm" variant="ghost">
          <Sheet aria-hidden className="size-4" />
          {exporting === 'csv' ? 'Generando…' : 'Datos en CSV'}
        </Button>
        {exportError ? (
          <p className="col-span-2 text-sm text-[var(--danger-text)] sm:col-span-3" role="alert">
            {exportError}
          </p>
        ) : null}
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
          mascot="wink"
          title="Todavía sin entrenos"
        />
      )}
    </div>
  );
}
