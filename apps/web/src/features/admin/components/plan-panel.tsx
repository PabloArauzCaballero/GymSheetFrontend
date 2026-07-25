'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { facilitiesAdminService } from '@/features/admin/services/facilities-admin-service';
import { membershipAdminService } from '@/features/admin/services/membership-admin-service';
import { PlanScopeEditButton } from './plan-scope-edit-button';
import { planTypes } from '@/shared/api/contracts';
import { queryKeys } from '@/shared/api/query-keys';
import { EmptyState } from '@/shared/components/feedback/empty-state';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogTrigger } from '@/shared/components/ui/dialog';
import { Field } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import { Select } from '@/shared/components/ui/select';
import { Table, TableCell, TableContainer, TableHead } from '@/shared/components/ui/table';
import { Textarea } from '@/shared/components/ui/textarea';

export function PlanPanel() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const plans = useQuery({
    queryKey: queryKeys.admin.plans,
    queryFn: membershipAdminService.listPlans,
  });
  const branches = useQuery({
    queryKey: queryKeys.admin.branches(1),
    queryFn: () => facilitiesAdminService.listBranches(1),
  });
  const rooms = useQuery({
    queryKey: queryKeys.admin.rooms(1),
    queryFn: () => facilitiesAdminService.listRooms(1),
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.admin.plans });
  const create = useMutation({
    mutationFn: (form: FormData) =>
      membershipAdminService.createPlan({
        codigo: String(form.get('codigo')),
        nombre: String(form.get('nombre')),
        descripcion: String(form.get('descripcion') || '') || null,
        tipo: String(form.get('tipo')) as (typeof planTypes)[number],
        duracionDias: Number(form.get('duracionDias')),
        diasRecordatorio: String(form.get('diasRecordatorio') || '7,3,1,0')
          .split(',')
          .map(Number)
          .filter(Number.isFinite),
        alcances: [
          { sedeId: String(form.get('sedeId')), salaId: String(form.get('salaId') || '') || null },
        ],
        metadata: {},
      }),
    onSuccess: async () => {
      await refresh();
      setOpen(false);
      toast.success('Plan creado.');
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const update = useMutation({
    mutationFn: ({ id, estado }: { id: string; estado: 'ACTIVE' | 'INACTIVE' }) =>
      membershipAdminService.updatePlan(id, { estado }),
    onSuccess: async () => {
      await refresh();
      toast.success('Estado del plan actualizado.');
    },
    onError: (error: Error) => toast.error(error.message),
  });
  return (
    <section className="grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Planes</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Duración, recordatorios y alcance físico.
          </p>
        </div>
        <Dialog onOpenChange={setOpen} open={open}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4" />
              Nuevo plan
            </Button>
          </DialogTrigger>
          <DialogContent title="Registrar plan">
            <form action={(form) => create.mutate(form)} className="grid gap-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Código">
                  <Input name="codigo" required />
                </Field>
                <Field label="Nombre">
                  <Input name="nombre" required />
                </Field>
                <Field label="Tipo">
                  <Select name="tipo">
                    {planTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Duración en días">
                  <Input min="1" name="duracionDias" required type="number" />
                </Field>
              </div>
              <Field hint="Ejemplo: 7,3,1,0" label="Días de recordatorio">
                <Input defaultValue="7,3,1,0" name="diasRecordatorio" />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Sede autorizada">
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
              </div>
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
      </div>
      {plans.isError ? (
        <ErrorPanel message={plans.error.message} onRetry={() => plans.refetch()} />
      ) : plans.data?.length ? (
        <div className="panel overflow-hidden">
          <TableContainer>
            <Table>
              <thead>
                <tr>
                  <TableHead>Plan</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Duración</TableHead>
                  <TableHead>Alcances</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </tr>
              </thead>
              <tbody>
                {plans.data.map((plan) => (
                  <tr key={plan.id}>
                    <TableCell>
                      <p className="font-semibold">{plan.nombre}</p>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">{plan.codigo}</p>
                    </TableCell>
                    <TableCell>
                      <Badge>{plan.tipo}</Badge>
                    </TableCell>
                    <TableCell>{plan.duracionDias} días</TableCell>
                    <TableCell>{plan.alcances.length}</TableCell>
                    <TableCell>
                      <Select
                        disabled={update.isPending}
                        onChange={(event) =>
                          update.mutate({
                            id: plan.id,
                            estado: event.target.value as 'ACTIVE' | 'INACTIVE',
                          })
                        }
                        value={plan.estado}
                      >
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="INACTIVE">INACTIVE</option>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <PlanScopeEditButton plan={plan} />
                    </TableCell>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableContainer>
        </div>
      ) : (
        <EmptyState
          description="Crea el primer plan con al menos un alcance de sede."
          title="Sin planes"
        />
      )}
    </section>
  );
}
