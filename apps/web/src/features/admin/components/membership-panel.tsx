'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { membershipAdminService } from '@/features/admin/services/membership-admin-service';
import { membershipStatuses } from '@/shared/api/contracts';
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
import { formatDate } from '@/shared/lib/date';

export function MembershipPanel() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const memberships = useQuery({
    queryKey: queryKeys.admin.memberships(1),
    queryFn: () => membershipAdminService.listMemberships(1),
  });
  const customers = useQuery({
    queryKey: queryKeys.admin.customers(1),
    queryFn: () => membershipAdminService.listCustomers(1),
  });
  const plans = useQuery({
    queryKey: queryKeys.admin.plans,
    queryFn: membershipAdminService.listPlans,
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin', 'memberships'] });
  const create = useMutation({
    mutationFn: (form: FormData) =>
      membershipAdminService.createMembership({
        clienteUsuarioId: String(form.get('clienteUsuarioId')),
        planId: String(form.get('planId')),
        iniciaEl: String(form.get('iniciaEl') || '') || undefined,
        referenciaExterna: String(form.get('referenciaExterna') || '') || null,
        notas: String(form.get('notas') || '') || null,
      }),
    onSuccess: async () => {
      await refresh();
      setOpen(false);
      toast.success('Membresía creada.');
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const changeStatus = useMutation({
    mutationFn: ({ id, estado }: { id: string; estado: (typeof membershipStatuses)[number] }) =>
      membershipAdminService.changeStatus(id, estado),
    onSuccess: async () => {
      await refresh();
      toast.success('Estado actualizado.');
    },
    onError: (error: Error) => toast.error(error.message),
  });
  return (
    <section className="grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Membresías</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Asignación de plan, vigencia y transición de estado.
          </p>
        </div>
        <Dialog onOpenChange={setOpen} open={open}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4" />
              Nueva membresía
            </Button>
          </DialogTrigger>
          <DialogContent title="Asignar membresía">
            <form action={(form) => create.mutate(form)} className="grid gap-5">
              <Field label="Cliente">
                <Select name="clienteUsuarioId" required>
                  {customers.data?.items.map((customer) => (
                    <option key={customer.usuarioId} value={customer.usuarioId}>
                      {customer.usuario?.nombreCompleto ?? customer.numeroCliente}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Plan">
                <Select name="planId" required>
                  {plans.data
                    ?.filter((plan) => plan.estado === 'ACTIVE')
                    .map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.nombre}
                      </option>
                    ))}
                </Select>
              </Field>
              <Field label="Fecha de inicio">
                <Input name="iniciaEl" type="date" />
              </Field>
              <Field label="Referencia externa">
                <Input name="referenciaExterna" />
              </Field>
              <Field label="Notas">
                <Textarea name="notas" />
              </Field>
              <div className="flex justify-end gap-2">
                <DialogClose asChild>
                  <Button type="button" variant="ghost">
                    Cancelar
                  </Button>
                </DialogClose>
                <Button loading={create.isPending} type="submit" variant="primary">
                  Asignar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      {memberships.isError ? (
        <ErrorPanel message={memberships.error.message} onRetry={() => memberships.refetch()} />
      ) : memberships.data?.items.length ? (
        <div className="panel overflow-hidden">
          <TableContainer>
            <Table>
              <thead>
                <tr>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Vigencia</TableHead>
                  <TableHead>Días</TableHead>
                  <TableHead>Estado</TableHead>
                </tr>
              </thead>
              <tbody>
                {memberships.data.items.map((membership) => (
                  <tr key={membership.id}>
                    <TableCell className="data-value text-xs">
                      {membership.clienteUsuarioId}
                    </TableCell>
                    <TableCell>
                      <p className="font-semibold">
                        {membership.plan?.nombre ?? membership.planId}
                      </p>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        {membership.plan?.codigo}
                      </p>
                    </TableCell>
                    <TableCell>
                      {formatDate(membership.iniciaEl)} → {formatDate(membership.venceEl)}
                    </TableCell>
                    <TableCell>
                      <Badge tone={membership.diasRestantes <= 3 ? 'warning' : 'neutral'}>
                        {membership.diasRestantes}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Select
                        disabled={changeStatus.isPending}
                        onChange={(event) =>
                          changeStatus.mutate({
                            id: membership.id,
                            estado: event.target.value as (typeof membershipStatuses)[number],
                          })
                        }
                        value={membership.estado}
                      >
                        {membershipStatuses.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </Select>
                    </TableCell>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableContainer>
        </div>
      ) : (
        <EmptyState
          description="Crea una membresía para un cliente y un plan existentes."
          title="Sin membresías"
        />
      )}
    </section>
  );
}
