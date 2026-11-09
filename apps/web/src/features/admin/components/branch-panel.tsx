'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPin, MapPinned } from 'lucide-react';
import { useRef, useState } from 'react';
import { notify } from '@/shared/notifications';
import { facilitiesAdminService } from '@/features/admin/services/facilities-admin-service';
import type { Branch } from '@/shared/api/contracts';
import { queryKeys } from '@/shared/api/query-keys';
import { EmptyState } from '@/shared/components/feedback/empty-state';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { LoadingPanel } from '@/shared/components/feedback/loading-panel';
import { Button } from '@/shared/components/ui/button';
import { Select } from '@/shared/components/ui/select';
import { Table, TableCell, TableContainer, TableHead } from '@/shared/components/ui/table';
import { pointOf } from '@/shared/lib/geo';
import { cn } from '@/shared/lib/cn';
import { BranchCreateDialog } from './branch-create-dialog';
import { BranchLocationDialog } from './branch-location-dialog';
import { BranchesMap } from './branches-map';

export function BranchPanel({ canManage }: Readonly<{ canManage: boolean }>) {
  const queryClient = useQueryClient();
  const mapRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [locating, setLocating] = useState<Branch | null>(null);
  const query = useQuery({
    queryKey: queryKeys.admin.branchesAll,
    queryFn: facilitiesAdminService.listAllBranches,
  });
  const branches = query.data ?? [];
  const update = useMutation({
    mutationFn: ({ id, estado }: { id: string; estado: 'ACTIVE' | 'INACTIVE' }) =>
      facilitiesAdminService.updateBranch(id, { estado }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'branches'] });
      notify.success('Estado de sede actualizado.');
    },
    onError: (error: Error) => notify.error(error),
  });

  const showOnMap = (id: string) => {
    setSelectedId(id);
    mapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <section className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Sedes</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Ubicación, zona horaria y estado operativo de cada sede.
          </p>
        </div>
        {canManage ? <BranchCreateDialog branches={branches} /> : null}
      </div>

      {query.isError ? (
        <ErrorPanel message={query.error.message} onRetry={() => query.refetch()} />
      ) : query.isPending ? (
        <LoadingPanel />
      ) : (
        <>
          <div className="min-w-0 scroll-mt-24" ref={mapRef}>
            <BranchesMap branches={branches} onSelect={setSelectedId} selectedId={selectedId} />
          </div>
          {branches.length ? (
            <div className="panel overflow-hidden">
              <TableContainer>
                <Table>
                  <thead>
                    <tr>
                      <TableHead>Sede</TableHead>
                      <TableHead>Ubicación</TableHead>
                      <TableHead>Zona horaria</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Mapa</TableHead>
                    </tr>
                  </thead>
                  <tbody>
                    {branches.map((branch) => {
                      const located = pointOf(branch) !== null;
                      return (
                        <tr
                          className={cn(branch.id === selectedId && 'bg-[var(--surface-low)]')}
                          key={branch.id}
                        >
                          <TableCell>
                            <p className="font-semibold">{branch.nombre}</p>
                            <p className="mt-1 text-xs text-[var(--text-muted)]">
                              {branch.codigo}
                              {branch.descripcion ? ` · ${branch.descripcion}` : ''}
                            </p>
                          </TableCell>
                          <TableCell className="max-w-72 text-sm text-[var(--text-muted)]">
                            {located
                              ? (branch.direccion ?? 'Ubicada (sin dirección)')
                              : 'Sin ubicar'}
                          </TableCell>
                          <TableCell className="data-value text-xs">{branch.zonaHoraria}</TableCell>
                          <TableCell>
                            {canManage ? (
                              <Select
                                aria-label={`Estado de ${branch.nombre}`}
                                disabled={update.isPending}
                                onChange={(event) =>
                                  update.mutate({
                                    id: branch.id,
                                    estado: event.target.value as 'ACTIVE' | 'INACTIVE',
                                  })
                                }
                                value={branch.estado}
                              >
                                <option value="ACTIVE">Activa</option>
                                <option value="INACTIVE">Inactiva</option>
                              </Select>
                            ) : branch.estado === 'ACTIVE' ? (
                              'Activa'
                            ) : (
                              'Inactiva'
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {located ? (
                                <Button
                                  aria-label={`Ver ${branch.nombre} en el mapa`}
                                  onClick={() => showOnMap(branch.id)}
                                  size="sm"
                                  variant="ghost"
                                >
                                  <MapPinned aria-hidden className="size-4" />
                                  Ver
                                </Button>
                              ) : null}
                              {canManage ? (
                                <Button
                                  aria-label={`${located ? 'Mover' : 'Ubicar'} ${branch.nombre}`}
                                  onClick={() => setLocating(branch)}
                                  size="sm"
                                  variant={located ? 'ghost' : 'secondary'}
                                >
                                  <MapPin aria-hidden className="size-4" />
                                  {located ? 'Mover' : 'Ubicar'}
                                </Button>
                              ) : null}
                            </div>
                          </TableCell>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </TableContainer>
            </div>
          ) : (
            <EmptyState
              description="Registra la primera sede para poder crear salas y puntos de acceso."
              title="Sin sedes"
            />
          )}
        </>
      )}
      <BranchLocationDialog
        branch={locating}
        branches={branches}
        onClose={() => setLocating(null)}
      />
    </section>
  );
}
