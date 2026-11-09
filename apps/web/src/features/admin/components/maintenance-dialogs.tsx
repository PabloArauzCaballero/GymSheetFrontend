'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { facilitiesAdminService } from '@/features/admin/services/facilities-admin-service';
import { maintenanceTypes, type Equipment, type MaintenanceType } from '@/shared/api/contracts';
import { Button } from '@/shared/components/ui/button';
import { ChoiceCards } from '@/shared/components/ui/choice-cards';
import { Dialog, DialogContent, DialogTrigger } from '@/shared/components/ui/dialog';
import { Field } from '@/shared/components/ui/field';
import {
  FormWizard,
  textOf,
  WizardSummary,
  type WizardStep,
} from '@/shared/components/ui/form-wizard';
import { Input } from '@/shared/components/ui/input';
import { Select } from '@/shared/components/ui/select';
import { Textarea } from '@/shared/components/ui/textarea';
import { formatDate } from '@/shared/lib/date';
import { notify } from '@/shared/notifications';
import { maintenanceTypeLabels } from './facility-labels';

const refreshKey = { queryKey: ['admin', 'maintenance'] };

/** Fecha local de hoy en `YYYY-MM-DD`, el formato de `<input type="date">`. */
function today(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

/** Programar mantenimiento: equipo → tipo y fecha → detalle → revisión. */
export function ScheduleMaintenanceDialog({ equipment }: Readonly<{ equipment: Equipment[] }>) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const schedule = useMutation({
    mutationFn: (values: FormData) =>
      facilitiesAdminService.scheduleMaintenance({
        equipoId: textOf(values, 'equipoId'),
        tipo: textOf(values, 'tipo') as MaintenanceType,
        programadoPara: textOf(values, 'programadoPara'),
        descripcion: textOf(values, 'descripcion'),
        proveedor: textOf(values, 'proveedor') || null,
        tecnico: textOf(values, 'tecnico') || null,
        metadata: {},
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries(refreshKey);
      setOpen(false);
      notify.success('Mantenimiento programado.');
    },
    onError: (error: Error) => notify.error(error),
  });
  const equipmentName = (id: string) => equipment.find((item) => item.id === id)?.nombre ?? '';

  const steps: WizardStep[] = [
    {
      id: 'equipment',
      title: 'Equipo',
      description: 'El activo que recibirá el mantenimiento.',
      render: () => (
        <Field
          hint={equipment.length ? undefined : 'No hay equipos registrados en el inventario.'}
          htmlFor="maintenance-equipment"
          label="Equipo"
        >
          <Select id="maintenance-equipment" name="equipoId" required>
            {equipment.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nombre}
                {item.etiquetaActivo ? ` · ${item.etiquetaActivo}` : ''}
              </option>
            ))}
          </Select>
        </Field>
      ),
    },
    {
      id: 'plan',
      title: 'Tipo y fecha',
      render: () => (
        <>
          <ChoiceCards
            choices={maintenanceTypes.map((type) => ({
              value: type,
              ...maintenanceTypeLabels[type],
            }))}
            legend="Tipo de mantenimiento"
            name="tipo"
          />
          <Field label="Fecha programada">
            <Input defaultValue={today()} name="programadoPara" required type="date" />
          </Field>
        </>
      ),
    },
    {
      id: 'detail',
      title: 'Detalle',
      description: 'Qué se hará y quién lo hará.',
      render: () => (
        <>
          <Field label="Descripción del trabajo">
            <Textarea maxLength={4000} minLength={3} name="descripcion" required />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Proveedor (opcional)">
              <Input maxLength={180} name="proveedor" />
            </Field>
            <Field label="Técnico (opcional)">
              <Input maxLength={180} name="tecnico" />
            </Field>
          </div>
        </>
      ),
    },
    {
      id: 'review',
      title: 'Revisión',
      render: (values) => (
        <WizardSummary
          items={[
            { label: 'Equipo', value: equipmentName(textOf(values, 'equipoId')) },
            {
              label: 'Tipo',
              value: maintenanceTypeLabels[textOf(values, 'tipo') as MaintenanceType]?.title,
            },
            {
              label: 'Fecha',
              value: textOf(values, 'programadoPara')
                ? formatDate(textOf(values, 'programadoPara'))
                : '',
            },
            {
              label: 'Proveedor / técnico',
              value: [textOf(values, 'proveedor'), textOf(values, 'tecnico')]
                .filter(Boolean)
                .join(' · '),
            },
            { label: 'Descripción', value: textOf(values, 'descripcion') },
          ]}
        />
      ),
    },
  ];

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" />
          Programar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl" title="Programar mantenimiento">
        <FormWizard
          onCancel={() => setOpen(false)}
          onSubmit={(values) => schedule.mutate(values)}
          pending={schedule.isPending}
          steps={steps}
          submitLabel="Programar"
        />
      </DialogContent>
    </Dialog>
  );
}

/** Cerrar un mantenimiento en curso: diagnóstico → costo → revisión. */
export function CompleteMaintenanceDialog({
  eventId,
  onClose,
}: Readonly<{ eventId: string | null; onClose: () => void }>) {
  const queryClient = useQueryClient();
  const complete = useMutation({
    mutationFn: ({ id, values }: { id: string; values: FormData }) =>
      facilitiesAdminService.completeMaintenance(id, {
        hallazgos: textOf(values, 'hallazgos') || null,
        resolucion: textOf(values, 'resolucion'),
        costo: textOf(values, 'costo') ? Number(textOf(values, 'costo')) : null,
        moneda: textOf(values, 'moneda').toUpperCase() || null,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries(refreshKey);
      onClose();
      notify.success('Mantenimiento completado.');
    },
    onError: (error: Error) => notify.error(error),
  });

  const steps: WizardStep[] = [
    {
      id: 'diagnosis',
      title: 'Diagnóstico',
      description: 'Qué se encontró y cómo se resolvió.',
      render: () => (
        <>
          <Field label="Hallazgos (opcional)">
            <Textarea maxLength={4000} name="hallazgos" />
          </Field>
          <Field label="Resolución">
            <Textarea maxLength={4000} minLength={3} name="resolucion" required />
          </Field>
        </>
      ),
    },
    {
      id: 'cost',
      title: 'Costo',
      description: 'Opcional. Si registras un costo, indica también la moneda.',
      validate: (values) =>
        Boolean(textOf(values, 'costo')) !== Boolean(textOf(values, 'moneda'))
          ? 'Costo y moneda deben indicarse juntos.'
          : null,
      render: () => (
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Costo">
            <Input inputMode="decimal" min="0" name="costo" step="0.01" type="number" />
          </Field>
          <Field hint="Código ISO de 3 letras." label="Moneda">
            <Input
              maxLength={3}
              minLength={3}
              name="moneda"
              pattern="[A-Za-z]{3}"
              placeholder="BOB"
            />
          </Field>
        </div>
      ),
    },
    {
      id: 'review',
      title: 'Revisión',
      render: (values) => (
        <WizardSummary
          items={[
            { label: 'Resolución', value: textOf(values, 'resolucion') },
            { label: 'Hallazgos', value: textOf(values, 'hallazgos') },
            {
              label: 'Costo',
              value: textOf(values, 'costo')
                ? `${textOf(values, 'costo')} ${textOf(values, 'moneda').toUpperCase()}`
                : 'Sin costo registrado',
            },
          ]}
        />
      ),
    },
  ];

  return (
    <Dialog onOpenChange={(open) => !open && onClose()} open={Boolean(eventId)}>
      <DialogContent className="max-w-2xl" title="Completar mantenimiento">
        <FormWizard
          onCancel={onClose}
          onSubmit={(values) => {
            if (eventId) complete.mutate({ id: eventId, values });
          }}
          pending={complete.isPending}
          steps={steps}
          submitLabel="Completar"
        />
      </DialogContent>
    </Dialog>
  );
}
