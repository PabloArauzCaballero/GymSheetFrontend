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
import { Textarea } from '@/shared/components/ui/textarea';

export function BranchPanel({ canManage }: Readonly<{ canManage: boolean }>) {
  const [page] = useState(1);
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.admin.branches(page),
    queryFn: () => facilitiesAdminService.listBranches(page),
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin', 'branches'] });
  const create = useMutation({
    mutationFn: (form: FormData) =>
      facilitiesAdminService.createBranch({
        codigo: String(form.get('codigo')),
        nombre: String(form.get('nombre')),
        descripcion: String(form.get('descripcion') || '') || null,
        zonaHoraria: String(form.get('zonaHoraria') || 'America/La_Paz'),
        metadata: {},
      }),
    onSuccess: async () => {
      await refresh();
      setOpen(false);
      toast.success('Sede creada.');
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const update = useMutation({
    mutationFn: ({ id, estado }: { id: string; estado: 'ACTIVE' | 'INACTIVE' }) =>
      facilitiesAdminService.updateBranch(id, { estado }),
    onSuccess: async () => {
      await refresh();
      toast.success('Estado de sede actualizado.');
    },
    onError: (error: Error) => toast.error(error.message),
  });
  return (
    <section className="grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Sedes</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Zonas horarias y estado operativo.
          </p>
        </div>
        {canManage ? (
          <Dialog onOpenChange={setOpen} open={open}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4" />
                Nueva sede
              </Button>
            </DialogTrigger>
            <DialogContent title="Registrar sede">
              <form action={(form) => create.mutate(form)} className="grid gap-5">
                <Field label="Código">
                  <Input name="codigo" required />
                </Field>
                <Field label="Nombre">
                  <Input name="nombre" required />
                </Field>
                <Field label="Zona horaria">
                  <Input defaultValue="America/La_Paz" name="zonaHoraria" required />
                </Field>
                <Field label="Descripción">
                  <Textarea name="descripcion" />
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
      {query.isError ? (
        <ErrorPanel message={query.error.message} onRetry={() => query.refetch()} />
      ) : query.data?.items.length ? (
        <div className="panel overflow-hidden">
          <TableContainer>
            <Table>
              <thead>
                <tr>
                  <TableHead>Sede</TableHead>
                  <TableHead>Zona horaria</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Descripción</TableHead>
                </tr>
              </thead>
              <tbody>
                {query.data.items.map((branch) => (
                  <tr key={branch.id}>
                    <TableCell>
                      <p className="font-semibold">{branch.nombre}</p>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">{branch.codigo}</p>
                    </TableCell>
                    <TableCell className="data-value text-xs">{branch.zonaHoraria}</TableCell>
                    <TableCell>
                      {canManage ? (
                        <Select
                          disabled={update.isPending}
                          onChange={(event) =>
                            update.mutate({
                              id: branch.id,
                              estado: event.target.value as 'ACTIVE' | 'INACTIVE',
                            })
                          }
                          value={branch.estado}
                        >
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="INACTIVE">INACTIVE</option>
                        </Select>
                      ) : (
                        branch.estado
                      )}
                    </TableCell>
                    <TableCell className="text-[var(--text-muted)]">
                      {branch.descripcion ?? '—'}
                    </TableCell>
                  </tr>
                ))}
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
    </section>
  );
}
