'use client';

import { useQuery } from '@tanstack/react-query';
import { Download, FileJson, Plus } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { workoutService } from '@/features/workouts/services/workout-service';
import { queryKeys } from '@/shared/api/query-keys';
import { EmptyState } from '@/shared/components/feedback/empty-state';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { LoadingPanel } from '@/shared/components/feedback/loading-panel';
import { PageHeader } from '@/shared/components/layout/page-header';
import { Badge } from '@/shared/components/ui/badge';
import { Button, ButtonLink } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Pagination } from '@/shared/components/ui/pagination';
import { formatDateTime, formatDuration } from '@/shared/lib/date';

function sessionVolume(session: Awaited<ReturnType<typeof workoutService.get>>) {
  return session.ejercicios.reduce(
    (total, exercise) =>
      total +
      exercise.series.reduce((subtotal, set) => subtotal + set.pesoKg * set.repeticiones, 0),
    0,
  );
}

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
      toast.success('Exportación preparada.');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'No se pudo exportar.');
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="grid gap-8">
      <PageHeader
        actions={
          <>
            <Button loading={exporting === 'json'} onClick={() => exportHistory('json')}>
              <FileJson className="size-4" />
              JSON
            </Button>
            <Button loading={exporting === 'csv'} onClick={() => exportHistory('csv')}>
              <Download className="size-4" />
              CSV
            </Button>
            <ButtonLink href="/workouts/new" variant="primary">
              <Plus className="size-4" />
              Nueva sesión
            </ButtonLink>
          </>
        }
        description="Historial propio, paginado y exportable sin cargar datos ilimitados en memoria."
        eyebrow="Trazabilidad"
        title="Entrenamientos"
      />
      {query.isLoading ? (
        <LoadingPanel rows={7} />
      ) : query.isError ? (
        <ErrorPanel message={query.error.message} onRetry={() => query.refetch()} />
      ) : query.data?.items.length ? (
        <>
          <section className="grid gap-3">
            {query.data.items.map((session) => (
              <Link href={`/workouts/${session.id}`} key={session.id}>
                <Card className="grid gap-5 p-5 transition-colors hover:border-[var(--border)] hover:bg-[var(--surface-low)] sm:grid-cols-[minmax(0,1fr)_repeat(3,minmax(110px,auto))] sm:items-center">
                  <div>
                    <p className="font-bold">{formatDateTime(session.fechaInicio)}</p>
                    <p className="mt-1 line-clamp-1 text-sm text-[var(--text-muted)]">
                      {session.observacion ?? 'Sin observación'}
                    </p>
                  </div>
                  <div>
                    <p className="data-label">Duración</p>
                    <p className="data-value mt-2">
                      {formatDuration(session.fechaInicio, session.fechaFin)}
                    </p>
                  </div>
                  <div>
                    <p className="data-label">Volumen</p>
                    <p className="data-value mt-2">
                      {Math.round(sessionVolume(session)).toLocaleString('es-BO')} KG
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <Badge
                      tone={
                        session.estado === 'FINALIZADA'
                          ? 'success'
                          : session.estado === 'CANCELADA'
                            ? 'danger'
                            : 'warning'
                      }
                    >
                      {session.estado}
                    </Badge>
                  </div>
                </Card>
              </Link>
            ))}
          </section>
          <Pagination
            onPageChange={setPage}
            page={query.data.page}
            totalPages={query.data.totalPages}
          />
        </>
      ) : (
        <EmptyState
          action={
            <ButtonLink href="/workouts/new" variant="primary">
              Iniciar primera sesión
            </ButtonLink>
          }
          description="Tu historial aparecerá aquí después de iniciar una sesión."
          title="Sin entrenamientos registrados"
        />
      )}
    </div>
  );
}
