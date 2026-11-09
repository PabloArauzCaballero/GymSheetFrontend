'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { facilitiesAdminService } from '@/features/admin/services/facilities-admin-service';
import { roomTypes, type Branch, type RoomType } from '@/shared/api/contracts';
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
import { roomTypeLabels } from './facility-labels';

/** Alta de sala en tres pasos: sede → espacio → revisión. */
export function RoomCreateDialog({ branches }: Readonly<{ branches: Branch[] }>) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const active = branches.filter((branch) => branch.estado === 'ACTIVE');
  const create = useMutation({
    mutationFn: (values: FormData) =>
      facilitiesAdminService.createRoom({
        sedeId: textOf(values, 'sedeId'),
        codigo: textOf(values, 'codigo'),
        nombre: textOf(values, 'nombre'),
        tipoSala: textOf(values, 'tipoSala') as RoomType,
        capacidad: textOf(values, 'capacidad') ? Number(textOf(values, 'capacidad')) : null,
        metadata: {},
      }),
    onSuccess: async (room) => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'rooms'] });
      setOpen(false);
      notify.success(`Sala «${room.nombre}» creada.`);
    },
    onError: (error: Error) => notify.error(error),
  });
  const branchName = (id: string) => branches.find((branch) => branch.id === id)?.nombre ?? '';

  const steps: WizardStep[] = [
    {
      id: 'branch',
      title: 'Sede',
      description: 'La sala pertenece a una sede activa y no se puede mover después.',
      render: () => (
        <Field
          hint={
            active.length ? undefined : 'No hay sedes activas. Activa o registra una sede primero.'
          }
          htmlFor="room-branch"
          label="Sede"
        >
          <Select id="room-branch" name="sedeId" required>
            {active.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.nombre}
                {branch.direccion ? ` — ${branch.direccion}` : ''}
              </option>
            ))}
          </Select>
        </Field>
      ),
    },
    {
      id: 'space',
      title: 'Espacio',
      description: 'Identificación, uso y aforo de la sala.',
      render: () => (
        <>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field hint="Único. Letras, números, punto o guion." label="Código">
              <Input
                maxLength={80}
                minLength={2}
                autoComplete="off"
                name="codigo"
                spellCheck={false}
                pattern="[A-Za-z0-9._\-]+"
                placeholder="SALA-1"
                required
              />
            </Field>
            <Field label="Nombre">
              <Input
                maxLength={180}
                minLength={2}
                name="nombre"
                placeholder="Sala de pesas"
                required
              />
            </Field>
          </div>
          <ChoiceCards
            choices={roomTypes.map((type) => ({ value: type, title: roomTypeLabels[type] }))}
            columns={4}
            legend="Tipo de sala"
            name="tipoSala"
          />
          <Field hint="Personas a la vez. Déjalo vacío si no aplica." label="Capacidad (opcional)">
            <Input
              inputMode="numeric"
              max="100000"
              min="1"
              name="capacidad"
              step="1"
              type="number"
            />
          </Field>
        </>
      ),
    },
    {
      id: 'review',
      title: 'Revisión',
      render: (values) => (
        <WizardSummary
          items={[
            { label: 'Sede', value: branchName(textOf(values, 'sedeId')) },
            { label: 'Código', value: textOf(values, 'codigo').toUpperCase() },
            { label: 'Nombre', value: textOf(values, 'nombre') },
            { label: 'Tipo', value: roomTypeLabels[textOf(values, 'tipoSala') as RoomType] },
            { label: 'Capacidad', value: textOf(values, 'capacidad') || 'Sin límite declarado' },
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
          Nueva sala
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl" title="Registrar sala">
        <FormWizard
          onCancel={() => setOpen(false)}
          onSubmit={(values) => create.mutate(values)}
          pending={create.isPending}
          steps={steps}
          submitLabel="Registrar sala"
        />
      </DialogContent>
    </Dialog>
  );
}
