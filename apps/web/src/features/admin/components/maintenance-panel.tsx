'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Play } from 'lucide-react';
import { useState } from 'react';
import { notify } from '@/shared/notifications';
import { facilitiesAdminService } from '@/features/admin/services/facilities-admin-service';
import { exerciseService } from '@/features/exercises/services/exercise-service';
import { queryKeys } from '@/shared/api/query-keys';
import { EmptyState } from '@/shared/components/feedback/empty-state';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Table, TableCell, TableContainer, TableHead } from '@/shared/components/ui/table';
import { formatDate } from '@/shared/lib/date';
import { maintenanceTypeLabels } from './facility-labels';
import { CompleteMaintenanceDialog, ScheduleMaintenanceDialog } from './maintenance-dialogs';

export function MaintenancePanel() {
  const [completeId, setCompleteId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const equipment = useQuery({
    queryKey: queryKeys.equipment,
    queryFn: exerciseService.listEquipment,
  });
  const events = useQuery({
    queryKey: queryKeys.admin.maintenance(1),
    queryFn: () => facilitiesAdminService.listMaintenance(1),
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin', 'maintenance'] });
  const start = useMutation({
    mutationFn: facilitiesAdminService.startMaintenance,
    onSuccess: async () => {
      await refresh();
      notify.success('Mantenimiento iniciado.');
    },
    onError: (error: Error) => notify.error(error),
  });
  const equipmentNames = new Map((equipment.data ?? []).map((item) => [item.id, item.nombre]));
  return (
    <section className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Mantenimiento</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Ciclo programado → en progreso → completado.
          </p>
        </div>
        <ScheduleMaintenanceDialog equipment={equipment.data ?? []} />
      </div>
      {events.isError ? (
        <ErrorPanel message={events.error.message} onRetry={() => events.refetch()} />
      ) : events.data?.items.length ? (
        <div className="panel overflow-hidden">
          <TableContainer>
            <Table>
              <thead>
                <tr>
                  <TableHead>Equipo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Programado</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </tr>
              </thead>
              <tbody>
                {events.data.items.map((event) => (
                  <tr key={event.id}>
                    <TableCell>
                      {equipmentNames.get(event.equipoId) ?? (
                        <span className="data-value text-xs">{event.equipoId}</span>
                      )}
                    </TableCell>
                    <TableCell>{maintenanceTypeLabels[event.tipo].title}</TableCell>
                    <TableCell>{formatDate(event.programadoPara)}</TableCell>
                    <TableCell>
                      <Badge
                        tone={
                          event.estado === 'COMPLETED'
                            ? 'success'
                            : event.estado === 'IN_PROGRESS'
                              ? 'warning'
                              : event.estado === 'CANCELLED'
                                ? 'danger'
                                : 'neutral'
                        }
                      >
                        {event.estado}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {event.estado === 'SCHEDULED' ? (
                        <Button
                          loading={start.isPending}
                          onClick={() => start.mutate(event.id)}
                          size="sm"
                        >
                          <Play className="size-4" />
                          Iniciar
                        </Button>
                      ) : event.estado === 'IN_PROGRESS' ? (
                        <Button onClick={() => setCompleteId(event.id)} size="sm" variant="primary">
                          <CheckCircle2 className="size-4" />
                          Completar
                        </Button>
                      ) : null}
                    </TableCell>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableContainer>
        </div>
      ) : (
        <EmptyState
          description="Programa mantenimiento preventivo, correctivo o inspección."
          title="Sin eventos"
        />
      )}
      <CompleteMaintenanceDialog eventId={completeId} onClose={() => setCompleteId(null)} />
    </section>
  );
}
