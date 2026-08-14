'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { confirm, notify } from '@/shared/notifications';
import { z } from 'zod';
import { equipmentAdminService } from '@/features/admin/services/equipment-admin-service';
import { exerciseService } from '@/features/exercises/services/exercise-service';
import { equipmentStatuses, equipmentTypes } from '@/shared/api/contracts';
import { queryKeys } from '@/shared/api/query-keys';
import { EmptyState } from '@/shared/components/feedback/empty-state';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { LoadingPanel } from '@/shared/components/feedback/loading-panel';
import { PageHeader } from '@/shared/components/layout/page-header';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogTrigger } from '@/shared/components/ui/dialog';
import { Field } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import { Select } from '@/shared/components/ui/select';
import { Table, TableCell, TableContainer, TableHead } from '@/shared/components/ui/table';
import { Textarea } from '@/shared/components/ui/textarea';
import { downloadCsv, downloadJson, type CsvColumn } from '@/shared/lib/data-transfer';
import type { Equipment } from '@/shared/api/contracts';
import { EquipmentBulkImport } from './equipment-bulk-import';

const exportColumns: CsvColumn<Equipment>[] = [
  { key: 'id', header: 'id', value: (item) => item.id },
  { key: 'nombre', header: 'nombre', value: (item) => item.nombre },
  { key: 'tipo', header: 'tipo', value: (item) => item.tipo },
  { key: 'estado', header: 'estado', value: (item) => item.estado },
  { key: 'descripcion', header: 'descripcion', value: (item) => item.descripcion ?? '' },
];

const schema = z.object({
  nombre: z.string().trim().min(2).max(140),
  tipo: z.enum(equipmentTypes),
  descripcion: z.string().trim().max(500).optional(),
});
type FormValues = z.infer<typeof schema>;

export function EquipmentAdmin({ canManage }: Readonly<{ canManage: boolean }>) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: queryKeys.equipment, queryFn: exerciseService.listEquipment });
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { nombre: '', tipo: 'MAQUINA', descripcion: '' },
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.equipment });
  const create = useMutation({
    mutationFn: (values: FormValues) =>
      equipmentAdminService.create({ ...values, descripcion: values.descripcion?.trim() || null }),
    onSuccess: async () => {
      await refresh();
      form.reset();
      setOpen(false);
      notify.success('Equipo creado.');
    },
    onError: (error: Error) => form.setError('root', { message: error.message }),
  });
  const update = useMutation({
    mutationFn: ({ id, estado }: { id: string; estado: (typeof equipmentStatuses)[number] }) =>
      equipmentAdminService.update(id, { estado }),
    onSuccess: async () => {
      await refresh();
      notify.success('Estado actualizado.');
    },
    onError: (error: Error) => notify.error(error),
  });
  const remove = useMutation({
    mutationFn: equipmentAdminService.inactivate,
    onSuccess: async () => {
      await refresh();
      notify.success('Equipo inactivado.');
    },
    onError: (error: Error) => notify.error(error),
  });
  if (query.isLoading) return <LoadingPanel rows={7} />;
  return (
    <div className="grid gap-8">
      <PageHeader
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              disabled={!query.data?.length}
              onClick={() =>
                downloadCsv(query.data ?? [], exportColumns, 'gymsheet-equipos.csv')
              }
              size="sm"
              variant="ghost"
            >
              <Download className="size-4" />
              CSV
            </Button>
            <Button
              disabled={!query.data?.length}
              onClick={() => downloadJson(query.data ?? [], 'gymsheet-equipos.json')}
              size="sm"
              variant="ghost"
            >
              <Download className="size-4" />
              JSON
            </Button>
            {canManage ? <EquipmentBulkImport /> : null}
            {canManage ? (
              <Dialog onOpenChange={setOpen} open={open}>
                <DialogTrigger asChild>
                  <Button variant="primary">
                    <Plus className="size-4" />
                    Nuevo equipo
                  </Button>
                </DialogTrigger>
              <DialogContent
                description="Los equipos nuevos quedan disponibles y pueden asociarse a ejercicios y salas."
                title="Registrar equipo"
              >
                <form
                  className="grid gap-5"
                  onSubmit={form.handleSubmit((values) => create.mutate(values))}
                >
                  <Field
                    error={form.formState.errors.nombre?.message}
                    htmlFor="equipment-name"
                    label="Nombre"
                  >
                    <Input id="equipment-name" {...form.register('nombre')} />
                  </Field>
                  <Field htmlFor="equipment-type" label="Tipo">
                    <Select id="equipment-type" {...form.register('tipo')}>
                      {equipmentTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field htmlFor="equipment-description" label="Descripción">
                    <Textarea id="equipment-description" {...form.register('descripcion')} />
                  </Field>
                  {form.formState.errors.root?.message ? (
                    <p className="text-sm text-[var(--danger-text)]">{form.formState.errors.root.message}</p>
                  ) : null}
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
        }
        description="La lista pública del backend devuelve únicamente equipos disponibles. Al cambiar a mantenimiento o inactivo, el registro deja de aparecer en esta vista."
        eyebrow="Activos físicos"
        title="Equipamiento"
      />
      {query.isError ? (
        <ErrorPanel message={query.error.message} onRetry={() => query.refetch()} />
      ) : query.data?.length ? (
        <div className="panel overflow-hidden">
          <TableContainer>
            <Table>
              <thead>
                <tr>
                  <TableHead>Equipo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </tr>
              </thead>
              <tbody>
                {query.data.map((item) => (
                  <tr key={item.id}>
                    <TableCell>
                      <p className="font-semibold">{item.nombre}</p>
                      <p className="mt-1 text-xs text-[var(--text-disabled)]">{item.id}</p>
                    </TableCell>
                    <TableCell>
                      <Badge>{item.tipo}</Badge>
                    </TableCell>
                    <TableCell>
                      {canManage ? (
                        <Select
                          aria-label={`Estado de ${item.nombre}`}
                          className="min-w-44"
                          disabled={update.isPending}
                          onChange={(event) =>
                            update.mutate({
                              id: item.id,
                              estado: event.target.value as (typeof equipmentStatuses)[number],
                            })
                          }
                          value={item.estado}
                        >
                          {equipmentStatuses.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </Select>
                      ) : (
                        <Badge>{item.estado}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="max-w-sm text-[var(--text-muted)]">
                      {item.descripcion ?? '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      {canManage ? (
                        <Button
                          aria-label={`Inactivar ${item.nombre}`}
                          loading={remove.isPending}
                          onClick={async () => {
                            const result = await confirm({
                              title: 'Inactivar equipo',
                              message: `«${item.nombre}» dejará de estar disponible para asignaciones.`,
                              severity: 'warning',
                              confirmLabel: 'Inactivar',
                            });
                            if (result.confirmed) remove.mutate(item.id);
                          }}
                          size="icon"
                          variant="ghost"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableContainer>
        </div>
      ) : (
        <EmptyState
          description="Registra el primer equipo operativo."
          title="Sin equipos disponibles"
        />
      )}
    </div>
  );
}
