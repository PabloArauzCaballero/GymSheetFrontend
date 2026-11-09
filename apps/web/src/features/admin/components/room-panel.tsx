'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notify } from '@/shared/notifications';
import { facilitiesAdminService } from '@/features/admin/services/facilities-admin-service';
import { queryKeys } from '@/shared/api/query-keys';
import { EmptyState } from '@/shared/components/feedback/empty-state';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { Select } from '@/shared/components/ui/select';
import { Table, TableCell, TableContainer, TableHead } from '@/shared/components/ui/table';
import { roomTypeLabels } from './facility-labels';
import { RoomCreateDialog } from './room-create-dialog';

export function RoomPanel({ canManage }: Readonly<{ canManage: boolean }>) {
  const queryClient = useQueryClient();
  const branches = useQuery({
    queryKey: queryKeys.admin.branches(1),
    queryFn: () => facilitiesAdminService.listBranches(1),
  });
  const rooms = useQuery({
    queryKey: queryKeys.admin.rooms(1),
    queryFn: () => facilitiesAdminService.listRooms(1),
  });
  const branchNames = new Map(
    (branches.data?.items ?? []).map((branch) => [branch.id, branch.nombre]),
  );
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin', 'rooms'] });
  const update = useMutation({
    mutationFn: ({
      id,
      estado,
    }: {
      id: string;
      estado: 'ACTIVE' | 'MAINTENANCE' | 'CLOSED' | 'INACTIVE';
    }) => facilitiesAdminService.updateRoom(id, { estado }),
    onSuccess: async () => {
      await refresh();
      notify.success('Estado de sala actualizado.');
    },
    onError: (error: Error) => notify.error(error),
  });
  return (
    <section className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Salas</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Capacidad, tipo y estado de cada espacio.
          </p>
        </div>
        {canManage ? <RoomCreateDialog branches={branches.data?.items ?? []} /> : null}
      </div>
      {rooms.isError ? (
        <ErrorPanel message={rooms.error.message} onRetry={() => rooms.refetch()} />
      ) : rooms.data?.items.length ? (
        <div className="panel overflow-hidden">
          <TableContainer>
            <Table>
              <thead>
                <tr>
                  <TableHead>Sala</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Capacidad</TableHead>
                  <TableHead>Estado</TableHead>
                </tr>
              </thead>
              <tbody>
                {rooms.data.items.map((room) => (
                  <tr key={room.id}>
                    <TableCell>
                      <p className="font-semibold">{room.nombre}</p>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        {room.codigo}
                        {branchNames.get(room.sedeId) ? ` · ${branchNames.get(room.sedeId)}` : ''}
                      </p>
                    </TableCell>
                    <TableCell>{roomTypeLabels[room.tipoSala]}</TableCell>
                    <TableCell>{room.capacidad ?? '—'}</TableCell>
                    <TableCell>
                      {canManage ? (
                        <Select
                          disabled={update.isPending}
                          onChange={(event) =>
                            update.mutate({
                              id: room.id,
                              estado: event.target.value as
                                'ACTIVE' | 'MAINTENANCE' | 'CLOSED' | 'INACTIVE',
                            })
                          }
                          value={room.estado}
                        >
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="MAINTENANCE">MAINTENANCE</option>
                          <option value="CLOSED">CLOSED</option>
                          <option value="INACTIVE">INACTIVE</option>
                        </Select>
                      ) : (
                        room.estado
                      )}
                    </TableCell>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableContainer>
        </div>
      ) : (
        <EmptyState description="Crea una sala dentro de una sede activa." title="Sin salas" />
      )}
    </section>
  );
}
