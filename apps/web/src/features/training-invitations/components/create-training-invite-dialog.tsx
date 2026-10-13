'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/shared/components/ui/dialog';
import { Field } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { trainingService } from '@/features/training/services/training-service';
import { queryKeys } from '@/shared/api/query-keys';
import { localInviteTime } from '../lib/local-invite-time';
import { trainingInvitationsService } from '../services/training-invitations-service';

function localDateTimeMinimum() {
  const date = new Date(Date.now() + 60_000);
  date.setSeconds(0, 0);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function CreateTrainingInviteDialog({
  recipientId,
  recipientName,
}: Readonly<{ recipientId: string; recipientName: string }>) {
  const [open, setOpen] = useState(false);
  const [startsAt, setStartsAt] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [placeLabel, setPlaceLabel] = useState('');
  const [note, setNote] = useState('');
  const [mode, setMode] = useState<'OWN_ROUTINES' | 'SHARED_SESSION'>('OWN_ROUTINES');
  const [routineSessionId, setRoutineSessionId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const requestId = useRef<string | null>(null);
  const queryClient = useQueryClient();
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const routines = useQuery({
    queryKey: queryKeys.routines('mine'),
    queryFn: () => trainingService.list('mine'),
    enabled: open && mode === 'SHARED_SESSION',
  });

  const create = useMutation({
    mutationFn: () => {
      if (!requestId.current) requestId.current = crypto.randomUUID();
      return trainingInvitationsService.create({
        recipientId,
        startsAt: localInviteTime(startsAt, timeZone),
        timeZone,
        durationMinutes: Number(durationMinutes),
        place: { kind: 'PUBLIC_PLACE', label: placeLabel.trim() },
        mode,
        ...(mode === 'SHARED_SESSION' ? { routineSessionId } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
        clientRequestId: requestId.current,
      });
    },
    onSuccess: (invitation) => {
      setCreatedId(invitation.id);
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ['training-invitations'] });
    },
    onError: (cause: Error) => setError(cause.message),
  });

  function clearAttempt() {
    if (create.isPending) return;
    requestId.current = null;
    setError(null);
    setCreatedId(null);
  }

  function closeDialog(nextOpen: boolean) {
    if (!nextOpen && create.isPending) return;
    setOpen(nextOpen);
    if (nextOpen) return;
    setStartsAt('');
    setDurationMinutes('60');
    setPlaceLabel('');
    setNote('');
    setMode('OWN_ROUTINES');
    setRoutineSessionId('');
    requestId.current = null;
    setError(null);
    setCreatedId(null);
  }

  return (
    <Dialog onOpenChange={closeDialog} open={open}>
      <DialogTrigger asChild>
        <Button variant="secondary">Entrenemos juntos</Button>
      </DialogTrigger>
      <DialogContent
        description={`Propón una sesión a ${recipientName}. La invitación se enviará solo si la conexión sigue activa.`}
        title="Invitar a entrenar"
      >
        {createdId ? (
          <div aria-live="polite" className="grid gap-4">
            <p className="rounded-lg border border-[var(--success-border)] bg-[var(--success-bg)] p-3 text-sm text-[var(--success-text)]">
              Invitación enviada a {recipientName}.
            </p>
            <Button onClick={() => closeDialog(false)} variant="primary">
              Listo
            </Button>
          </div>
        ) : (
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              setError(null);
              create.mutate();
            }}
          >
            <Field
              hint={`Se usará tu hora local (${timeZone || 'zona desconocida'}).`}
              label="Día y hora"
            >
              <Input
                autoFocus
                disabled={create.isPending}
                min={localDateTimeMinimum()}
                onChange={(event) => {
                  setStartsAt(event.target.value);
                  clearAttempt();
                }}
                required
                type="datetime-local"
                value={startsAt}
              />
            </Field>
            <Field label="Duración">
              <select
                className="h-11 w-full rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-low)] px-3 text-sm text-[var(--text)]"
                disabled={create.isPending}
                onChange={(event) => {
                  setDurationMinutes(event.target.value);
                  clearAttempt();
                }}
                value={durationMinutes}
              >
                <option value="30">30 minutos</option>
                <option value="45">45 minutos</option>
                <option value="60">1 hora</option>
                <option value="90">1 hora y media</option>
                <option value="120">2 horas</option>
              </select>
            </Field>
            <Field
              hint="En sesión compartida, ambos verán una copia acordada de ejercicios, series, repeticiones y descansos."
              label="Modalidad"
            >
              <select
                aria-label="Modalidad"
                className="h-11 w-full rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-low)] px-3 text-sm text-[var(--text)]"
                disabled={create.isPending}
                onChange={(event) => {
                  setMode(event.target.value as 'OWN_ROUTINES' | 'SHARED_SESSION');
                  setRoutineSessionId('');
                  clearAttempt();
                }}
                value={mode}
              >
                <option value="OWN_ROUTINES">Cada uno con su rutina</option>
                <option value="SHARED_SESSION">Compartir una rutina</option>
              </select>
            </Field>
            {mode === 'SHARED_SESSION' ? (
              <Field label="Rutina compartida">
                <select
                  aria-label="Rutina compartida"
                  className="h-11 w-full rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-low)] px-3 text-sm text-[var(--text)]"
                  disabled={create.isPending || routines.isLoading || !routines.data?.items.length}
                  onChange={(event) => {
                    setRoutineSessionId(event.target.value);
                    clearAttempt();
                  }}
                  required
                  value={routineSessionId}
                >
                  <option value="">Elige una rutina</option>
                  {routines.data?.items.map((routine) => (
                    <option key={routine.id} value={routine.id}>
                      {routine.nombre}
                    </option>
                  ))}
                </select>
                {routines.isError ? (
                  <span className="text-sm text-[var(--danger-text)]">
                    No se pudieron cargar tus rutinas. Cierra y vuelve a abrir el formulario para
                    reintentar.
                  </span>
                ) : null}
                {routines.isSuccess && routines.data.items.length === 0 ? (
                  <span className="text-sm text-[var(--text-muted)]">
                    Crea una rutina antes de proponer una sesión compartida.
                  </span>
                ) : null}
              </Field>
            ) : null}
            <Field hint="Por ahora puedes proponer un lugar público." label="Lugar">
              <Input
                autoComplete="street-address"
                disabled={create.isPending}
                maxLength={180}
                onChange={(event) => {
                  setPlaceLabel(event.target.value);
                  clearAttempt();
                }}
                placeholder="Ej. Parque Central"
                required
                value={placeLabel}
              />
            </Field>
            <Field label="Nota (opcional)">
              <Textarea
                disabled={create.isPending}
                maxLength={1000}
                onChange={(event) => {
                  setNote(event.target.value);
                  clearAttempt();
                }}
                placeholder="¿Qué te gustaría entrenar?"
                value={note}
              />
            </Field>
            {error ? (
              <p role="alert" className="text-sm text-[var(--danger-text)]">
                {error}
              </p>
            ) : null}
            <Button
              disabled={
                !timeZone ||
                (mode === 'SHARED_SESSION' &&
                  (!routineSessionId || routines.isLoading || routines.isError))
              }
              loading={create.isPending}
              type="submit"
              variant="primary"
            >
              Enviar invitación
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
