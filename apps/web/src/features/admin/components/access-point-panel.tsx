'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { facilitiesAdminService } from '@/features/admin/services/facilities-admin-service';
import { queryKeys } from '@/shared/api/query-keys';
import { EmptyState } from '@/shared/components/feedback/empty-state';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogTrigger } from '@/shared/components/ui/dialog';
import { Field } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import { Select } from '@/shared/components/ui/select';
import { Table, TableCell, TableContainer, TableHead } from '@/shared/components/ui/table';

export function AccessPointPanel({ canManage }: Readonly<{ canManage: boolean }>) {
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
  const points = useQuery({
    queryKey: ['admin', 'access-points'],
    queryFn: () => facilitiesAdminService.listAccessPoints(),
  });
  const create = useMutation({
    mutationFn: (form: FormData) =>
      facilitiesAdminService.createAccessPoint({
        sedeId: String(form.get('sedeId')),
        salaId: String(form.get('salaId') || '') || null,
        codigo: String(form.get('codigo')),
        nombre: String(form.get('nombre')),
        direccionPermitida: String(form.get('direccionPermitida')) as 'ENTRY' | 'EXIT' | 'BOTH',
        metadata: {},
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'access-points'] });
      setOpen(false);
      toast.success('Punto de acceso creado.');
    },
    onError: (error: Error) => toast.error(error.message),
  });
  return (
    <section className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold">Puntos de acceso</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Dirección autorizada por sede o sala.
          </p>
        </div>
        {canManage ? (
          <Dialog onOpenChange={setOpen} open={open}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4" />
                Nuevo punto
              </Button>
            </DialogTrigger>
            <DialogContent title="Registrar punto de acceso">
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
                <Field label="Sala opcional">
                  <Select name="salaId">
                    <option value="">Toda la sede</option>
                    {rooms.data?.items.map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.nombre}
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
                <Field label="Dirección">
                  <Select name="direccionPermitida">
                    <option value="BOTH">BOTH</option>
                    <option value="ENTRY">ENTRY</option>
                    <option value="EXIT">EXIT</option>
                  </Select>
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
                    <TableCell className="data-value text-xs">{point.sedeId}</TableCell>
                    <TableCell className="data-value text-xs">{point.salaId ?? '—'}</TableCell>
                    <TableCell>{point.direccionPermitida}</TableCell>
                    <TableCell>{point.estado}</TableCell>
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
