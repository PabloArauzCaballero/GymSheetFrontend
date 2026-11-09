'use client';

import { useQuery } from '@tanstack/react-query';
import { facilitiesAdminService } from '@/features/admin/services/facilities-admin-service';
import { queryKeys } from '@/shared/api/query-keys';
import { EmptyState } from '@/shared/components/feedback/empty-state';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { Table, TableCell, TableContainer, TableHead } from '@/shared/components/ui/table';
import { AccessPointCreateDialog } from './access-point-create-dialog';
import { accessDirectionLabels } from './facility-labels';

export function AccessPointPanel({ canManage }: Readonly<{ canManage: boolean }>) {
  const branches = useQuery({
    queryKey: queryKeys.admin.branches(1),
    queryFn: () => facilitiesAdminService.listBranches(1),
  });
  const rooms = useQuery({
    queryKey: queryKeys.admin.rooms(1),
    queryFn: () => facilitiesAdminService.listRooms(1),
  });
  const points = useQuery({
    queryKey: ['admin', 'access-points'],
    queryFn: () => facilitiesAdminService.listAccessPoints(),
  });
  const branchNames = new Map(
    (branches.data?.items ?? []).map((branch) => [branch.id, branch.nombre]),
  );
  const roomNames = new Map((rooms.data?.items ?? []).map((room) => [room.id, room.nombre]));
  return (
    <section className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Puntos de acceso</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Dirección autorizada por sede o sala.
          </p>
        </div>
        {canManage ? (
          <AccessPointCreateDialog
            branches={branches.data?.items ?? []}
            rooms={rooms.data?.items ?? []}
          />
        ) : null}
      </div>
      {points.isError ? (
        <ErrorPanel message={points.error.message} onRetry={() => points.refetch()} />
      ) : points.data?.length ? (
        <div className="panel overflow-hidden">
          <TableContainer>
            <Table>
              <thead>
                <tr>
                  <TableHead>Punto</TableHead>
                  <TableHead>Sede</TableHead>
                  <TableHead>Sala</TableHead>
                  <TableHead>Dirección</TableHead>
                  <TableHead>Estado</TableHead>
                </tr>
              </thead>
              <tbody>
                {points.data.map((point) => (
                  <tr key={point.id}>
                    <TableCell>
                      <p className="font-semibold">{point.nombre}</p>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">{point.codigo}</p>
                    </TableCell>
                    <TableCell>{branchNames.get(point.sedeId) ?? point.sedeId}</TableCell>
                    <TableCell>
                      {point.salaId
                        ? (roomNames.get(point.salaId) ?? point.salaId)
                        : 'Toda la sede'}
                    </TableCell>
                    <TableCell>{accessDirectionLabels[point.direccionPermitida].title}</TableCell>
                    <TableCell>{point.estado === 'ACTIVE' ? 'Activo' : 'Inactivo'}</TableCell>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableContainer>
        </div>
      ) : (
        <EmptyState
          description="Los dispositivos de control necesitan un punto de acceso válido."
          title="Sin puntos de acceso"
        />
      )}
    </section>
  );
}
