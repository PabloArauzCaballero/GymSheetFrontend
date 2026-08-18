'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { notify } from '@/shared/notifications';
import { facilitiesAdminService } from '@/features/admin/services/facilities-admin-service';
import {
  membershipAdminService,
  type PlanInput,
} from '@/features/admin/services/membership-admin-service';
import {
  PlanCommonFields,
  commercialFieldsFromForm,
  formatPlanPrice,
  parseReminderDays,
} from './plan-form-fields';
import { PlanImageButton } from './plan-image-button';
import { PlanScopeEditButton } from './plan-scope-edit-button';
import type { MembershipPlan, PlanType } from '@/shared/api/contracts';
import { queryKeys } from '@/shared/api/query-keys';
import { EmptyState } from '@/shared/components/feedback/empty-state';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { DomainImage, mediaProxyUrl } from '@/shared/components/media/domain-image';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogTrigger } from '@/shared/components/ui/dialog';
import { Field } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import { Select } from '@/shared/components/ui/select';
import { Table, TableCell, TableContainer, TableHead } from '@/shared/components/ui/table';

export function PlanPanel() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<MembershipPlan | null>(null);
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
  // Todo plan exige al menos un alcance de sede. Sin sedes registradas el alta
  // es un callejón sin salida: el formulario enviaría un identificador vacío y
  // el backend respondería con un error de validación difícil de interpretar.
  const hasBranches = Boolean(branches.data?.items.length);

  const create = useMutation({
    mutationFn: (form: FormData) => {
      const input: PlanInput = {
        codigo: String(form.get('codigo')),
        nombre: String(form.get('nombre')),
        descripcion: String(form.get('descripcion') || '') || null,
        tipo: String(form.get('tipo')) as PlanType,
        duracionDias: Number(form.get('duracionDias')),
        diasRecordatorio: parseReminderDays(String(form.get('diasRecordatorio') || '7,3,1,0')),
        alcances: [
          { sedeId: String(form.get('sedeId')), salaId: String(form.get('salaId') || '') || null },
        ],
        metadata: {},
        ...commercialFieldsFromForm(form),
      };
      return membershipAdminService.createPlan(input);
    },
    onSuccess: async () => {
      await refresh();
      setCreateOpen(false);
      notify.success('Plan creado. Añádele su QR de cobro desde la tabla.');
    },
    onError: (error: Error) => notify.error(error),
  });

  const edit = useMutation({
    mutationFn: ({ id, form }: { id: string; form: FormData }) =>
      membershipAdminService.updatePlan(id, {
        nombre: String(form.get('nombre')),
        descripcion: String(form.get('descripcion') || '') || null,
        tipo: String(form.get('tipo')) as PlanType,
        duracionDias: Number(form.get('duracionDias')),
        diasRecordatorio: parseReminderDays(String(form.get('diasRecordatorio') || '7,3,1,0')),
        ...commercialFieldsFromForm(form),
      }),
    onSuccess: async () => {
      await refresh();
      setEditing(null);
      notify.success('Plan actualizado.');
    },
    onError: (error: Error) => notify.error(error),
  });

  const changeStatus = useMutation({
    mutationFn: ({ id, estado }: { id: string; estado: 'ACTIVE' | 'INACTIVE' }) =>
      membershipAdminService.updatePlan(id, { estado }),
    onSuccess: async () => {
      await refresh();
      notify.success('Estado del plan actualizado.');
    },
    onError: (error: Error) => notify.error(error),
  });

  return (
    <section className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold">Planes</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Precio, beneficios, duración, alcance físico e imagen QR de cobro.
          </p>
        </div>
        <Dialog onOpenChange={setCreateOpen} open={createOpen}>
          <DialogTrigger asChild>
            <Button disabled={!hasBranches} variant="primary">
              <Plus className="size-4" />
              Nuevo plan
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl" title="Registrar plan">
            <form action={(form) => create.mutate(form)} className="grid gap-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field hint="Letras, números, punto, guion o guion bajo." label="Código">
                  <Input name="codigo" pattern="[A-Za-z0-9._-]{2,80}" required />
                </Field>
                <Field label="Nombre">
                  <Input name="nombre" required />
                </Field>
              </div>
              <PlanCommonFields
                branches={branches.data?.items ?? []}
                rooms={rooms.data?.items ?? []}
                withScope
              />
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

      {!branches.isLoading && !hasBranches ? (
        <p className="rounded-[4px] border border-[var(--warning-border)] bg-[var(--warning-bg)] p-4 text-sm text-[var(--warning-text)]">
          No hay sedes registradas. Un plan necesita al menos una sede autorizada, así que primero
          crea una en{' '}
          <Link className="underline" href="/admin/facilities">
            Instalaciones
          </Link>
          .
        </p>
      ) : null}

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
                  <TableHead>Precio</TableHead>
                  <TableHead>Duración</TableHead>
                  <TableHead>QR</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </tr>
              </thead>
              <tbody>
                {plans.data.map((plan) => (
                  <tr key={plan.id}>
                    <TableCell>
                      <p className="font-semibold">{plan.nombre}</p>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        {plan.codigo} · orden {plan.orden} · {plan.alcances.length} alcance(s)
                      </p>
                      {plan.beneficios.length ? (
                        <p className="mt-1 text-xs text-[var(--text-muted)]">
                          {plan.beneficios.join(' · ')}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Badge>{plan.tipo}</Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{formatPlanPrice(plan)}</TableCell>
                    <TableCell className="whitespace-nowrap">{plan.duracionDias} días</TableCell>
                    <TableCell>
                      <div className="size-12 overflow-hidden rounded-[4px] border border-[var(--border-subtle)] bg-[var(--surface-low)]">
                        {plan.imagen ? (
                          <DomainImage
                            alt={plan.imagen.altText}
                            className="object-contain"
                            fallbackSrc={plan.imagen.url}
                            proxy={false}
                            src={mediaProxyUrl(plan.imagen.url)}
                          />
                        ) : (
                          <span className="grid size-full place-items-center text-[10px] text-[var(--text-disabled)]">
                            —
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        aria-label={`Estado de ${plan.nombre}`}
                        disabled={changeStatus.isPending}
                        onChange={(event) =>
                          changeStatus.mutate({
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
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button
                          aria-label={`Editar ${plan.nombre}`}
                          onClick={() => setEditing(plan)}
                          size="sm"
                          variant="ghost"
                        >
                          <Pencil className="size-4" />
                          Editar
                        </Button>
                        <PlanImageButton plan={plan} />
                        <PlanScopeEditButton plan={plan} />
                      </div>
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

      <Dialog onOpenChange={(next) => !next && setEditing(null)} open={Boolean(editing)}>
        {editing ? (
          <DialogContent
            className="max-w-2xl"
            description={`Código ${editing.codigo}. El código y los alcances se editan por separado.`}
            title={`Editar ${editing.nombre}`}
          >
            <form
              action={(form) => edit.mutate({ id: editing.id, form })}
              className="grid gap-5"
              key={editing.id}
            >
              <Field label="Nombre">
                <Input defaultValue={editing.nombre} name="nombre" required />
              </Field>
              <PlanCommonFields plan={editing} withScope={false} />
              <div className="flex justify-end gap-2">
                <Button onClick={() => setEditing(null)} type="button" variant="ghost">
                  Cancelar
                </Button>
                <Button loading={edit.isPending} type="submit" variant="primary">
                  Guardar cambios
                </Button>
              </div>
            </form>
          </DialogContent>
        ) : null}
      </Dialog>
    </section>
  );
}
