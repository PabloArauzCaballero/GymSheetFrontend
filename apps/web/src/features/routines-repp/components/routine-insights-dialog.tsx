'use client';

import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent } from '@/shared/components/ui/dialog';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { routinesReppService } from '@/features/routines-repp/services/routines-repp-service';

function Stat({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-[4px] border border-[var(--border-subtle)] p-3">
      <dt className="text-xs text-[var(--text-muted)]">{label}</dt>
      <dd className="mt-1 text-xl font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

/** Las métricas de una rutina: lo que el catálogo no cuenta en la lista. */
export function RoutineInsightsDialog({
  routineId,
  name,
  onClose,
}: Readonly<{ routineId: string; name: string; onClose: () => void }>) {
  const insights = useQuery({
    queryKey: ['sistema', 'rutinas-repp', 'insights', routineId],
    queryFn: () => routinesReppService.insights(routineId),
  });

  return (
    <Dialog onOpenChange={(open) => (open ? undefined : onClose())} open>
      <DialogContent description="Alcance y reacción de la comunidad." title={name}>
        {insights.isPending ? (
          <div aria-busy="true" className="h-40 animate-pulse rounded-[8px] bg-[var(--surface-low)]" />
        ) : insights.isError ? (
          <ErrorPanel message={insights.error.message} onRetry={() => void insights.refetch()} />
        ) : (
          <dl className="grid grid-cols-2 gap-3">
            <Stat label="Copias en total" value={String(insights.data.copias)} />
            <Stat label="Copias activas" value={String(insights.data.copiasVivas)} />
            <Stat label="Activaciones" value={String(insights.data.activaciones)} />
            <Stat label="Comentarios visibles" value={String(insights.data.comentarios)} />
            <Stat
              label="Valoración"
              value={
                insights.data.valoracionPromedio === null
                  ? 'Sin valorar'
                  : `${insights.data.valoracionPromedio.toFixed(1)} (${insights.data.valoracionTotal})`
              }
            />
            <Stat label="Denuncias" value={String(insights.data.denuncias)} />
          </dl>
        )}
      </DialogContent>
    </Dialog>
  );
}
