'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { facilitiesAdminService } from '@/features/admin/services/facilities-admin-service';
import type { Branch, Room } from '@/shared/api/contracts';
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
import { notify } from '@/shared/notifications';
import { accessDirectionLabels } from './facility-labels';

type Direction = keyof typeof accessDirectionLabels;

/** La sala se ofrece solo entre las de la sede elegida: una sala ajena sería rechazada. */
function PlacementStep({ branches, rooms }: Readonly<{ branches: Branch[]; rooms: Room[] }>) {
  const [branchId, setBranchId] = useState(branches[0]?.id ?? '');
  const options = rooms.filter((room) => room.sedeId === branchId && room.estado !== 'INACTIVE');
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field htmlFor="access-branch" label="Sede">
        <Select
          id="access-branch"
          name="sedeId"
          onChange={(event) => setBranchId(event.target.value)}
          required
          value={branchId}
        >
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.nombre}
            </option>
          ))}
        </Select>
      </Field>
      <Field
        hint={
          options.length
            ? 'Vacío: el punto controla el acceso a toda la sede.'
            : 'Esta sede no tiene salas: el punto cubre toda la sede.'
        }
        htmlFor="access-room"
        label="Sala (opcional)"
      >
        <Select id="access-room" key={branchId} name="salaId">
          <option value="">Toda la sede</option>
          {options.map((room) => (
            <option key={room.id} value={room.id}>
              {room.nombre}
            </option>
          ))}
        </Select>
      </Field>
    </div>
  );
}

export function AccessPointCreateDialog({
  branches,
  rooms,
}: Readonly<{ branches: Branch[]; rooms: Room[] }>) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const active = branches.filter((branch) => branch.estado === 'ACTIVE');
  const create = useMutation({
    mutationFn: (values: FormData) =>
      facilitiesAdminService.createAccessPoint({
        sedeId: textOf(values, 'sedeId'),
        salaId: textOf(values, 'salaId') || null,
        codigo: textOf(values, 'codigo'),
        nombre: textOf(values, 'nombre'),
        direccionPermitida: textOf(values, 'direccionPermitida') as Direction,
        metadata: {},
      }),
    onSuccess: async (point) => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'access-points'] });
      setOpen(false);
      notify.success(`Punto de acceso «${point.nombre}» creado.`);
    },
    onError: (error: Error) => notify.error(error),
  });
  const nameOf = (list: { id: string; nombre: string }[], id: string) =>
    list.find((item) => item.id === id)?.nombre ?? '';

  const steps: WizardStep[] = [
    {
      id: 'placement',
      title: 'Ubicación',
      description: 'Dónde está físicamente el torniquete, puerta o lector.',
      render: () => <PlacementStep branches={active} rooms={rooms} />,
    },
    {
      id: 'identity',
      title: 'Identidad',
      description: 'Los dispositivos de control se vinculan a este código.',
      render: () => (
        <div className="grid gap-5 sm:grid-cols-2">
          <Field hint="Único. Letras, números, punto o guion." label="Código">
            <Input
              maxLength={80}
              minLength={2}
              autoComplete="off"
              name="codigo"
              spellCheck={false}
              pattern="[A-Za-z0-9._\-]+"
              placeholder="PUERTA-1"
              required
            />
          </Field>
          <Field label="Nombre">
            <Input
              maxLength={180}
              minLength={2}
              name="nombre"
              placeholder="Torniquete principal"
              required
            />
          </Field>
        </div>
      ),
    },
    {
      id: 'direction',
      title: 'Sentido',
      description: 'Qué movimientos autoriza este punto.',
      render: () => (
        <ChoiceCards
          choices={(Object.keys(accessDirectionLabels) as Direction[]).map((value) => ({
            value,
            ...accessDirectionLabels[value],
          }))}
          legend="Sentido permitido"
          name="direccionPermitida"
        />
      ),
    },
    {
      id: 'review',
      title: 'Revisión',
      render: (values) => (
        <WizardSummary
          items={[
            { label: 'Sede', value: nameOf(branches, textOf(values, 'sedeId')) },
            { label: 'Sala', value: nameOf(rooms, textOf(values, 'salaId')) || 'Toda la sede' },
            { label: 'Código', value: textOf(values, 'codigo').toUpperCase() },
            { label: 'Nombre', value: textOf(values, 'nombre') },
            {
              label: 'Sentido',
              value:
                accessDirectionLabels[textOf(values, 'direccionPermitida') as Direction]?.title,
            },
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
          Nuevo punto
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl" title="Registrar punto de acceso">
        <FormWizard
          onCancel={() => setOpen(false)}
          onSubmit={(values) => create.mutate(values)}
          pending={create.isPending}
          steps={steps}
          submitLabel="Registrar punto"
        />
      </DialogContent>
    </Dialog>
  );
}
