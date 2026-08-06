'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Play, Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { facilitiesAdminService } from '@/features/admin/services/facilities-admin-service';
import { exerciseService } from '@/features/exercises/services/exercise-service';
import { maintenanceTypes } from '@/shared/api/contracts';
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

export function MaintenancePanel() {
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [completeId, setCompleteId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const equipment = useQuery({
    queryKey: queryKeys.equipment,
    queryFn: exerciseService.listEquipment,
  });
  const events = useQuery({
    queryKey: queryKeys.admin.maintenance(1),
    queryFn: () => facilitiesAdminService.listMaintenance(1),
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin', 'maintenance'] });
  const schedule = useMutation({
    mutationFn: (form: FormData) =>
      facilitiesAdminService.scheduleMaintenance({
        equipoId: String(form.get('equipoId')),
        tipo: String(form.get('tipo')) as (typeof maintenanceTypes)[number],
        programadoPara: String(form.get('programadoPara')),
        descripcion: String(form.get('descripcion')),
        proveedor: String(form.get('proveedor') || '') || null,
        tecnico: String(form.get('tecnico') || '') || null,
        metadata: {},
      }),
    onSuccess: async () => {
      await refresh();
      setScheduleOpen(false);
      toast.success('Mantenimiento programado.');
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const start = useMutation({
    mutationFn: facilitiesAdminService.startMaintenance,
    onSuccess: async () => {
      await refresh();
      toast.success('Mantenimiento iniciado.');
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const complete = useMutation({
    mutationFn: ({ id, form }: { id: string; form: FormData }) =>
      facilitiesAdminService.completeMaintenance(id, {
        hallazgos: String(form.get('hallazgos') || '') || null,
        resolucion: String(form.get('resolucion')),
        costo: form.get('costo') ? Number(form.get('costo')) : null,
        moneda: String(form.get('moneda') || '') || null,
      }),
    onSuccess: async () => {
      await refresh();
      setCompleteId(null);
      toast.success('Mantenimiento completado.');
    },
    onError: (error: Error) => toast.error(error.message),
  });
  return (
    <section className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold">Mantenimiento</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Ciclo programado → en progreso → completado.
          </p>
        </div>
        <Dialog onOpenChange={setScheduleOpen} open={scheduleOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4" />
              Programar
            </Button>
          </DialogTrigger>
          <DialogContent title="Programar mantenimiento">
            <form action={(form) => schedule.mutate(form)} className="grid gap-5">
              <Field label="Equipo">
                <Select name="equipoId" required>
                  {equipment.data?.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nombre}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Tipo">
                <Select name="tipo">
                  {maintenanceTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Fecha programada">
                <Input name="programadoPara" required type="date" />
              </Field>
              <Field label="Descripción">
                <Textarea name="descripcion" required />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Proveedor">
                  <Input name="proveedor" />
                </Field>
                <Field label="Técnico">
                  <Input name="tecnico" />
                </Field>
              </div>
              <div className="flex justify-end gap-2">
                <DialogClose asChild>
                  <Button type="button" variant="ghost">
                    Cancelar
                  </Button>
                </DialogClose>
                <Button loading={schedule.isPending} type="submit" variant="primary">
                  Guardar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      {events.isError ? (
        <ErrorPanel message={events.error.message} onRetry={() => events.refetch()} />
      ) : events.data?.items.length ? (
        <div className="panel overflow-hidden">
          <TableContainer>
            <Table>
              <thead>
                <tr>
                  <TableHead>Equipo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Programado</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </tr>
              </thead>
              <tbody>
                {events.data.items.map((event) => (
                  <tr key={event.id}>
                    <TableCell className="data-value text-xs">{event.equipoId}</TableCell>
                    <TableCell>{event.tipo}</TableCell>
                    <TableCell>{formatDate(event.programadoPara)}</TableCell>
                    <TableCell>
                      <Badge
                        tone={
                          event.estado === 'COMPLETED'
                            ? 'success'
                            : event.estado === 'IN_PROGRESS'
                              ? 'warning'
                              : event.estado === 'CANCELLED'
                                ? 'danger'
                                : 'neutral'
                        }
                      >
                        {event.estado}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {event.estado === 'SCHEDULED' ? (
                        <Button
                          loading={start.isPending}
                          onClick={() => start.mutate(event.id)}
                          size="sm"
                        >
                          <Play className="size-4" />
                          Iniciar
                        </Button>
                      ) : event.estado === 'IN_PROGRESS' ? (
                        <Button onClick={() => setCompleteId(event.id)} size="sm" variant="primary">
                          <CheckCircle2 className="size-4" />
                          Completar
                        </Button>
                      ) : null}
                    </TableCell>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableContainer>
        </div>
      ) : (
        <EmptyState
          description="Programa mantenimiento preventivo, correctivo o inspección."
          title="Sin eventos"
        />
      )}
      <Dialog onOpenChange={(open) => !open && setCompleteId(null)} open={Boolean(completeId)}>
        <DialogContent title="Completar mantenimiento">
          <form
            action={(form) => {
              if (completeId) complete.mutate({ id: completeId, form });
            }}
            className="grid gap-5"
          >
            <Field label="Hallazgos">
              <Textarea name="hallazgos" />
            </Field>
            <Field label="Resolución">
              <Textarea name="resolucion" required />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field hint="Costo y moneda deben enviarse juntos." label="Costo">
                <Input min="0" name="costo" step="0.01" type="number" />
              </Field>
              <Field label="Moneda ISO">
                <Input maxLength={3} name="moneda" placeholder="BOB" />
              </Field>
            </div>
            <div className="flex justify-end gap-2">
              <DialogClose asChild>
                <Button type="button" variant="ghost">
                  Cancelar
                </Button>
              </DialogClose>
              <Button loading={complete.isPending} type="submit" variant="primary">
                Completar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
