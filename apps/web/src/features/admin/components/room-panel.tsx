'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { facilitiesAdminService } from '@/features/admin/services/facilities-admin-service';
import { roomTypes } from '@/shared/api/contracts';
import { queryKeys } from '@/shared/api/query-keys';
import { EmptyState } from '@/shared/components/feedback/empty-state';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogTrigger } from '@/shared/components/ui/dialog';
import { Field } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import { Select } from '@/shared/components/ui/select';
import { Table, TableCell, TableContainer, TableHead } from '@/shared/components/ui/table';

export function RoomPanel({ canManage }: Readonly<{ canManage: boolean }>) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const branches = useQuery({
    queryKey: queryKeys.admin.branches(1),
    queryFn: () => facilitiesAdminService.listBranches(1),
  });
  const rooms = useQuery({
    queryKey: queryKeys.admin.rooms(1),
    queryFn: () => facilitiesAdminService.listRooms(1),
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin', 'rooms'] });
  const create = useMutation({
    mutationFn: (form: FormData) =>
      facilitiesAdminService.createRoom({
        sedeId: String(form.get('sedeId')),
        codigo: String(form.get('codigo')),
        nombre: String(form.get('nombre')),
        tipoSala: String(form.get('tipoSala')) as (typeof roomTypes)[number],
        capacidad: form.get('capacidad') ? Number(form.get('capacidad')) : null,
        metadata: {},
      }),
    onSuccess: async () => {
      await refresh();
      setOpen(false);
      toast.success('Sala creada.');
    },
    onError: (error: Error) => toast.error(error.message),
  });
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
      toast.success('Estado de sala actualizado.');
    },
    onError: (error: Error) => toast.error(error.message),
  });
  return (
    <section className="grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Salas</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Capacidad, tipo y estado de cada espacio.
          </p>
        </div>
        {canManage ? (
          <Dialog onOpenChange={setOpen} open={open}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4" />
                Nueva sala
              </Button>
            </DialogTrigger>
            <DialogContent title="Registrar sala">
              <form action={(form) => create.mutate(form)} className="grid gap-5">
                <Field label="Sede">
                  <Select name="sedeId" required>
                    {branches.data?.items.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.nombre}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Código">
                  <Input name="codigo" required />
                </Field>
                <Field label="Nombre">
                  <Input name="nombre" required />
                </Field>
                <Field label="Tipo">
                  <Select name="tipoSala">
                    {roomTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Capacidad">
                  <Input min="1" name="capacidad" type="number" />
                </Field>
                <div className="flex justify-end gap-2">
                  <DialogClose asChild>
                    <Button type="button" variant="ghost">
                      Cancelar
                    </Button>
                  </DialogClose>
                  <Button loading={create.isPending} type="submit" variant="primary">
                    Guardar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        ) : null}
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
                      <p className="mt-1 text-xs text-[var(--text-muted)]">{room.codigo}</p>
                    </TableCell>
                    <TableCell>{room.tipoSala}</TableCell>
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
