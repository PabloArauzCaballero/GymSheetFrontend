'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { Link2 } from 'lucide-react';
import { useState } from 'react';
import { notify } from '@/shared/notifications';
import { facilitiesAdminService } from '@/features/admin/services/facilities-admin-service';
import { exerciseService } from '@/features/exercises/services/exercise-service';
import { queryKeys } from '@/shared/api/query-keys';
import { EmptyState } from '@/shared/components/feedback/empty-state';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/shared/components/ui/dialog';
import { Field } from '@/shared/components/ui/field';
import {
  FormWizard,
  textOf,
  WizardSummary,
  type WizardStep,
} from '@/shared/components/ui/form-wizard';
import { Select } from '@/shared/components/ui/select';
import { Textarea } from '@/shared/components/ui/textarea';
import { roomTypeLabels } from './facility-labels';

type Assignment = { equipment: string; room: string; at: Date };

/**
 * Asignar un equipo a una sala, en tres pasos: equipo → sala → revisión. El
 * backend registra fecha, sala y usuario actor; aquí se listan las asignaciones
 * hechas en esta sesión como confirmación inmediata.
 */
export function EquipmentAssignmentPanel() {
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<Assignment[]>([]);
  const equipment = useQuery({
    queryKey: queryKeys.equipment,
    queryFn: exerciseService.listEquipment,
  });
  const branches = useQuery({
    queryKey: queryKeys.admin.branches(1),
    queryFn: () => facilitiesAdminService.listBranches(1),
  });
  const rooms = useQuery({
    queryKey: queryKeys.admin.rooms(1),
    queryFn: () => facilitiesAdminService.listRooms(1),
  });
  const equipmentList = equipment.data ?? [];
  const roomList = (rooms.data?.items ?? []).filter((room) => room.estado !== 'INACTIVE');
  const branchName = (id: string) =>
    branches.data?.items.find((branch) => branch.id === id)?.nombre ?? '';
  const equipmentName = (id: string) => equipmentList.find((item) => item.id === id)?.nombre ?? '';
  const roomLabel = (id: string) => {
    const room = roomList.find((item) => item.id === id);
    return room
      ? `${room.nombre}${branchName(room.sedeId) ? ` · ${branchName(room.sedeId)}` : ''}`
      : '';
  };

  const assign = useMutation({
    mutationFn: (values: FormData) =>
      facilitiesAdminService.assignEquipment({
        equipoId: textOf(values, 'equipoId'),
        salaId: textOf(values, 'salaId'),
        notas: textOf(values, 'notas') || null,
      }),
    onSuccess: (_result, values) => {
      setRecent((list) => [
        {
          equipment: equipmentName(textOf(values, 'equipoId')),
          room: roomLabel(textOf(values, 'salaId')),
          at: new Date(),
        },
        ...list,
      ]);
      setOpen(false);
      notify.success('Equipo asignado a la sala.');
    },
    onError: (error: Error) => notify.error(error),
  });

  const steps: WizardStep[] = [
    {
      id: 'equipment',
      title: 'Equipo',
      description: 'El activo que se instala o se traslada.',
      render: () => (
        <Field htmlFor="assignment-equipment" label="Equipo">
          <Select id="assignment-equipment" name="equipoId" required>
            {equipmentList.map((item) => (
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
      id: 'room',
      title: 'Sala destino',
      description: 'Una asignación nueva cierra la anterior del mismo equipo.',
      render: () => (
        <>
          <Field htmlFor="assignment-room" label="Sala">
            <Select id="assignment-room" name="salaId" required>
              {roomList.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.nombre} — {roomTypeLabels[room.tipoSala]}
                  {branchName(room.sedeId) ? ` · ${branchName(room.sedeId)}` : ''}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Notas (opcional)">
            <Textarea
              maxLength={2000}
              name="notas"
              placeholder="Motivo del traslado, estado al instalar…"
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
            { label: 'Equipo', value: equipmentName(textOf(values, 'equipoId')) },
            { label: 'Sala', value: roomLabel(textOf(values, 'salaId')) },
            { label: 'Notas', value: textOf(values, 'notas') },
          ]}
        />
      ),
    },
  ];

  return (
    <section className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Asignaciones</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Ubica cada equipo en su sala. El backend registra fecha y usuario actor.
          </p>
        </div>
        <Dialog onOpenChange={setOpen} open={open}>
          <DialogTrigger asChild>
            <Button disabled={!equipmentList.length || !roomList.length}>
              <Link2 className="size-4" />
              Asignar equipo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl" title="Asignar equipo a sala">
            <FormWizard
              onCancel={() => setOpen(false)}
              onSubmit={(values) => assign.mutate(values)}
              pending={assign.isPending}
              steps={steps}
              submitLabel="Asignar"
            />
          </DialogContent>
        </Dialog>
      </div>
      {/* A-3: si el catálogo no carga, se dice y se ofrece reintentar. Sin esto
          parecería que no hay equipos ni salas, y el botón quedaría inútil. */}
      {equipment.isError || rooms.isError ? (
        <ErrorPanel
          message={
            (equipment.error ?? rooms.error)?.message ??
            'No se pudo cargar el catálogo de equipos y salas.'
          }
          onRetry={() => {
            void equipment.refetch();
            void rooms.refetch();
          }}
        />
      ) : recent.length ? (
        <ul className="panel grid divide-y divide-[var(--border-subtle)]">
          {recent.map((item) => (
            <li
              className="flex flex-wrap items-center justify-between gap-2 p-4"
              key={item.at.getTime()}
            >
              <span>
                <span className="font-semibold">{item.equipment}</span>
                <span className="text-[var(--text-muted)]"> → {item.room}</span>
              </span>
              <span className="text-xs text-[var(--text-muted)]">
                {item.at.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          description={
            !equipmentList.length || !roomList.length
              ? 'Necesitas al menos un equipo en el inventario y una sala activa para asignar.'
              : 'Las asignaciones que registres en esta sesión aparecerán aquí.'
          }
          title="Sin asignaciones recientes"
        />
      )}
    </section>
  );
}
