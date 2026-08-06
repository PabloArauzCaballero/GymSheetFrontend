'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { accessAdminService } from '@/features/admin/services/access-admin-service';
import { facilitiesAdminService } from '@/features/admin/services/facilities-admin-service';
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
import { formatDateTime } from '@/shared/lib/date';

const statuses = ['ACTIVE', 'MAINTENANCE', 'OFFLINE', 'INACTIVE'] as const;

export function AccessDevicePanel({ canManage }: Readonly<{ canManage: boolean }>) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const devices = useQuery({
    queryKey: queryKeys.admin.accessDevices,
    queryFn: accessAdminService.listDevices,
  });
  const points = useQuery({
    queryKey: ['admin', 'access-points'],
    queryFn: () => facilitiesAdminService.listAccessPoints(),
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.admin.accessDevices });
  const create = useMutation({
    mutationFn: (form: FormData) =>
      accessAdminService.createDevice({
        puntoAccesoId: String(form.get('puntoAccesoId')),
        adapterKey: String(form.get('adapterKey')),
        dispositivoExternoId: String(form.get('dispositivoExternoId')),
        nombre: String(form.get('nombre')),
        metadata: {},
      }),
    onSuccess: async () => {
      await refresh();
      setOpen(false);
      toast.success('Dispositivo creado.');
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const update = useMutation({
    mutationFn: ({ id, estado }: { id: string; estado: (typeof statuses)[number] }) =>
      accessAdminService.updateDeviceStatus(id, estado),
    onSuccess: async () => {
      await refresh();
      toast.success('Estado actualizado.');
    },
    onError: (error: Error) => toast.error(error.message),
  });
  return (
    <section className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold">Dispositivos</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Adaptadores físicos asociados a puntos de acceso.
          </p>
        </div>
        {canManage ? (
          <Dialog onOpenChange={setOpen} open={open}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4" />
                Nuevo dispositivo
              </Button>
            </DialogTrigger>
            <DialogContent title="Registrar dispositivo">
              <form action={(form) => create.mutate(form)} className="grid gap-5">
                <Field label="Punto de acceso">
                  <Select name="puntoAccesoId" required>
                    {points.data?.map((point) => (
                      <option key={point.id} value={point.id}>
                        {point.nombre}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field hint="Solo letras, números, punto, guion y guion bajo." label="Adapter key">
                  <Input name="adapterKey" pattern="[A-Za-z0-9._-]+" required />
                </Field>
                <Field label="ID externo">
                  <Input name="dispositivoExternoId" required />
                </Field>
                <Field label="Nombre">
                  <Input name="nombre" required />
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
      {devices.isError ? (
        <ErrorPanel message={devices.error.message} onRetry={() => devices.refetch()} />
      ) : devices.data?.length ? (
        <div className="panel overflow-hidden">
          <TableContainer>
            <Table>
              <thead>
                <tr>
                  <TableHead>Dispositivo</TableHead>
                  <TableHead>Adapter</TableHead>
                  <TableHead>Punto</TableHead>
                  <TableHead>Última señal</TableHead>
                  <TableHead>Estado</TableHead>
                </tr>
              </thead>
              <tbody>
                {devices.data.map((device) => (
                  <tr key={device.id}>
                    <TableCell>
                      <p className="font-semibold">{device.nombre}</p>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        {device.dispositivoExternoId}
                      </p>
                    </TableCell>
                    <TableCell className="data-value text-xs">{device.adapterKey}</TableCell>
                    <TableCell className="data-value text-xs">{device.puntoAccesoId}</TableCell>
                    <TableCell>{formatDateTime(device.vistoPorUltimaVezEn)}</TableCell>
                    <TableCell>
                      {canManage ? (
                        <Select
                          disabled={update.isPending}
                          onChange={(event) =>
                            update.mutate({
                              id: device.id,
                              estado: event.target.value as (typeof statuses)[number],
                            })
                          }
                          value={device.estado}
                        >
                          {statuses.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </Select>
                      ) : (
                        <Badge>{device.estado}</Badge>
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
          description="Registra un dispositivo después de crear su punto de acceso."
          title="Sin dispositivos"
        />
      )}
    </section>
  );
}
