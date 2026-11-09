'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { facilitiesAdminService } from '@/features/admin/services/facilities-admin-service';
import type { Branch } from '@/shared/api/contracts';
import { LocationPicker, readLocation } from '@/shared/components/map/location-picker';
import type { MapMarker } from '@/shared/components/map';
import { Button } from '@/shared/components/ui/button';
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
import { formatLatLng, pointOf } from '@/shared/lib/geo';
import { notify } from '@/shared/notifications';
import { localTimeIn, timeZones } from './facility-labels';

function TimeZoneStep() {
  const [zone, setZone] = useState<string>(timeZones[0]);
  const now = localTimeIn(zone);
  return (
    <Field
      hint={now ? `Hora local ahora: ${now}.` : undefined}
      htmlFor="branch-time-zone"
      label="Zona horaria"
    >
      <Select
        id="branch-time-zone"
        name="zonaHoraria"
        onChange={(event) => setZone(event.target.value)}
        required
        value={zone}
      >
        {timeZones.map((item) => (
          <option key={item} value={item}>
            {item.replaceAll('_', ' ')}
          </option>
        ))}
      </Select>
    </Field>
  );
}

/**
 * Alta de sede en cuatro pasos. La ubicación se elige en un mapa dentro del
 * propio diálogo: es lo que luego dibuja el mapa de Instalaciones.
 */
export function BranchCreateDialog({ branches }: Readonly<{ branches: Branch[] }>) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const create = useMutation({
    mutationFn: (values: FormData) => {
      const location = readLocation(values);
      return facilitiesAdminService.createBranch({
        codigo: textOf(values, 'codigo'),
        nombre: textOf(values, 'nombre'),
        descripcion: textOf(values, 'descripcion') || null,
        zonaHoraria: textOf(values, 'zonaHoraria') || 'America/La_Paz',
        direccion: location.address,
        latitud: location.point?.lat ?? null,
        longitud: location.point?.lng ?? null,
        metadata: {},
      });
    },
    onSuccess: async (branch) => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'branches'] });
      setOpen(false);
      notify.success(`Sede «${branch.nombre}» creada.`);
    },
    onError: (error: Error) => notify.error(error),
  });

  const context: MapMarker[] = branches.flatMap((branch) => {
    const position = pointOf(branch);
    return position ? [{ id: branch.id, position, label: branch.nombre }] : [];
  });

  const steps: WizardStep[] = [
    {
      id: 'identity',
      title: 'Identidad',
      description: 'Cómo se reconoce la sede en la consola y en los reportes.',
      render: () => (
        <>
          <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <Field hint="Letras, números, punto, guion. Se guarda en mayúsculas." label="Código">
              <Input
                autoComplete="off"
                maxLength={80}
                minLength={2}
                name="codigo"
                pattern="[A-Za-z0-9._\-]+"
                placeholder="SCZ-CENTRO"
                required
              />
            </Field>
            <Field label="Nombre">
              <Input
                maxLength={180}
                minLength={2}
                name="nombre"
                placeholder="Sede Centro"
                required
              />
            </Field>
          </div>
          <Field label="Descripción (opcional)">
            <Textarea
              maxLength={2000}
              name="descripcion"
              placeholder="Horario, referencias, servicios…"
            />
          </Field>
        </>
      ),
    },
    {
      id: 'location',
      title: 'Ubicación',
      description: 'Busca la dirección o marca la entrada de la sede en el mapa.',
      validate: (values) => readLocation(values).error,
      render: () => <LocationPicker context={context} initialCenter={context[0]?.position} />,
    },
    {
      id: 'operation',
      title: 'Operación',
      description: 'La zona horaria rige los horarios de acceso y los reportes de la sede.',
      render: () => <TimeZoneStep />,
    },
    {
      id: 'review',
      title: 'Revisión',
      description: 'Comprueba los datos antes de registrar la sede.',
      render: (values) => {
        const location = readLocation(values);
        return (
          <WizardSummary
            items={[
              { label: 'Código', value: textOf(values, 'codigo').toUpperCase() },
              { label: 'Nombre', value: textOf(values, 'nombre') },
              { label: 'Zona horaria', value: textOf(values, 'zonaHoraria') },
              {
                label: 'Coordenadas',
                value: location.point ? formatLatLng(location.point) : '',
              },
              { label: 'Dirección', value: location.address },
              { label: 'Descripción', value: textOf(values, 'descripcion') },
            ]}
          />
        );
      },
    },
  ];

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" />
          Nueva sede
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-w-3xl"
        description="Registra la sede y su ubicación para verla en el mapa."
        title="Registrar sede"
      >
        <FormWizard
          onCancel={() => setOpen(false)}
          onSubmit={(values) => create.mutate(values)}
          pending={create.isPending}
          steps={steps}
          submitLabel="Registrar sede"
        />
      </DialogContent>
    </Dialog>
  );
}
