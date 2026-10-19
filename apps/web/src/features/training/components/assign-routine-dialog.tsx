'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus } from 'lucide-react';
import { useState } from 'react';
import { notify } from '@/shared/notifications';
import { trainingService } from '@/features/training/services/training-service';
import { queryKeys } from '@/shared/api/query-keys';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogTrigger } from '@/shared/components/ui/dialog';
import { Field } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';

const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

/** Asignar la rutina a un cliente con fecha y/o días de la semana (entrenadores y administradores). */
export function AssignRoutineDialog({ routineId }: Readonly<{ routineId: string }>) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState('');
  const [scheduledFor, setScheduledFor] = useState('');
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const assign = useMutation({
    mutationFn: () =>
      trainingService.assign(routineId, {
        clienteUsuarioId: clientId.trim(),
        fechaProgramada: scheduledFor || null,
        diasSemana: weekdays,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.coachAssignments });
      setOpen(false);
      setClientId('');
      setScheduledFor('');
      setWeekdays([]);
      notify.success('Rutina asignada al cliente.');
    },
    onError: (error: Error) => notify.error(error),
  });

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <UserPlus className="size-4" />
          Asignar a cliente
        </Button>
      </DialogTrigger>
      <DialogContent
        description="Asigna esta rutina a un cliente. Puedes programar una fecha y/o días de la semana."
        title="Asignar rutina"
      >
        <div className="grid gap-5">
          <Field htmlFor="client-id" label="ID de usuario del cliente">
            <Input
              id="client-id"
              onChange={(event) => setClientId(event.target.value)}
              placeholder="UUID del cliente"
              value={clientId}
            />
          </Field>
          <Field htmlFor="scheduled-for" label="Fecha programada (opcional)">
            <Input
              id="scheduled-for"
              onChange={(event) => setScheduledFor(event.target.value)}
              type="date"
              value={scheduledFor}
            />
          </Field>
          <Field htmlFor="weekdays" label="Días de la semana (opcional)">
            <div className="flex flex-wrap gap-2" id="weekdays">
              {WEEKDAYS.map((label, day) => {
                const active = weekdays.includes(day);
                return (
                  <button
                    aria-pressed={active}
                    className={`min-h-9 rounded-[6px] border px-3 text-sm ${active ? 'border-[var(--volt)] bg-[color-mix(in_srgb,var(--volt)_14%,transparent)] text-[var(--text)]' : 'border-[var(--border-subtle)] text-[var(--text-muted)]'}`}
                    key={label}
                    onClick={() =>
                      setWeekdays((current) =>
                        current.includes(day) ? current.filter((value) => value !== day) : [...current, day],
                      )
                    }
                    type="button"
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </Field>
          <div className="flex flex-wrap justify-end gap-2">
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                Cancelar
              </Button>
            </DialogClose>
            <Button
              disabled={clientId.trim().length < 10}
              loading={assign.isPending}
              onClick={() => assign.mutate()}
              variant="primary"
            >
              Asignar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
