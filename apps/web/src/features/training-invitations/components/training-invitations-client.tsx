'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRef, useState, useSyncExternalStore } from 'react';
import { ApiError } from '@/shared/api/api-error';
import { EmptyState } from '@/shared/components/feedback/empty-state';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { SkeletonList } from '@/shared/components/feedback/skeleton';
import { PageHeader } from '@/shared/components/layout/page-header';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import type { SharedSession } from '../services/training-invitations-service';
import {
  trainingInvitationsService,
  type ListedTrainingInvitation,
} from '../services/training-invitations-service';

const invitationsKey = (sessionUserId: string) => ['training-invitations', sessionUserId] as const;
const subscribeToTimeZone = () => () => {};

function localDateTime(value: string, timeZone: string | null) {
  if (!timeZone) return 'Cargando hora local…';
  return new Intl.DateTimeFormat('es-BO', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone,
  }).format(new Date(value));
}

function invitationState(invitation: ListedTrainingInvitation) {
  if (invitation.state === 'CANCELLED' || invitation.meeting?.cancelledAt) return 'Cancelado';
  if (invitation.state === 'ACCEPTED') return 'Confirmado';
  if (invitation.state === 'DECLINED') return 'Rechazado';
  if (invitation.state === 'EXPIRED') return 'Vencido';
  return 'Pendiente';
}

function trainingPlaceMapUrl(placeLabel: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeLabel.trim())}`;
}

function SharedSessionDetails({ snapshot }: Readonly<{ snapshot: SharedSession }>) {
  return (
    <section
      aria-label="Rutina compartida acordada"
      className="grid gap-3 rounded-lg bg-[var(--surface-low)] p-4"
    >
      <div>
        <h4 className="font-semibold">Rutina compartida: {snapshot.name}</h4>
        <p className="text-xs text-[var(--text-muted)]">
          Copia acordada para esta invitación. El progreso y los pesos de cada persona son privados.
        </p>
      </div>
      {snapshot.exercises.length ? (
        <ol className="grid gap-2">
          {[...snapshot.exercises]
            .sort((a, b) => a.order - b.order)
            .map((exercise) => (
              <li
                className="rounded-md border border-[var(--border-subtle)] p-3 text-sm"
                key={`${exercise.order}:${exercise.exerciseId}`}
              >
                <p className="font-medium">
                  {exercise.order}. {exercise.exerciseName}
                </p>
                <p>
                  {exercise.targetSets} series ·{' '}
                  {exercise.repsMin === null && exercise.repsMax === null
                    ? 'repeticiones sin especificar'
                    : exercise.repsMin === exercise.repsMax
                      ? `${exercise.repsMin ?? ''} repeticiones`
                      : `${exercise.repsMin ?? '—'}–${exercise.repsMax ?? '—'} repeticiones`}
                  {' · '}
                  {exercise.restSeconds === null
                    ? 'descanso sin especificar'
                    : `${exercise.restSeconds} s de descanso`}
                </p>
              </li>
            ))}
        </ol>
      ) : (
        <p className="text-sm text-[var(--text-muted)]">La rutina acordada no tiene ejercicios.</p>
      )}
    </section>
  );
}

function InvitationCard({
  invitation,
  sessionUserId,
  timeZone,
  onRespond,
  responding,
  onExport,
  exporting,
}: Readonly<{
  invitation: ListedTrainingInvitation;
  sessionUserId: string;
  timeZone: string | null;
  onRespond: (id: string, revision: number, decision: 'ACCEPT' | 'DECLINE') => void;
  responding: boolean;
  onExport: (id: string) => void;
  exporting: boolean;
}>) {
  const revision = invitation.revisions.find(
    (item) => item.revision === invitation.currentRevision,
  );
  const sharedSession = useQuery({
    queryKey: ['training-invitations', sessionUserId, invitation.id, 'shared-session'],
    queryFn: () => trainingInvitationsService.sharedSession(invitation.id),
    enabled:
      invitation.state === 'ACCEPTED' &&
      Boolean(invitation.meeting) &&
      !invitation.meeting?.cancelledAt &&
      revision?.mode === 'SHARED_SESSION',
  });
  if (!revision) return null;

  const canAccept = invitation.state === 'PENDING' && revision.proposerId !== sessionUserId;
  const start = invitation.meeting?.startsAt ?? revision.startsAt;
  const place = invitation.meeting?.placeLabel ?? revision.place.label;
  const direction = invitation.participants[0] === sessionUserId ? 'Enviada' : 'Recibida';

  return (
    <Card className="grid gap-4 p-5" data-testid={`training-invitation-${invitation.id}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <h3 className="text-lg font-semibold">{place}</h3>
          <p className="text-sm text-[var(--text-muted)]">
            {direction} · Revisión {invitation.currentRevision}
          </p>
        </div>
        <span className="rounded-full border border-[var(--border-subtle)] px-3 py-1 text-xs font-semibold">
          {invitationState(invitation)}
        </span>
      </div>
      <div className="grid gap-1 text-sm">
        <p>{localDateTime(start, timeZone)}</p>
        <p className="text-[var(--text-muted)]">
          {revision.durationMinutes} minutos ·{' '}
          {revision.mode === 'OWN_ROUTINES' ? 'Cada uno con su rutina' : 'Sesión compartida'}
        </p>
        {revision.note ? <p className="mt-2">{revision.note}</p> : null}
      </div>
      {invitation.meeting && place.trim() ? (
        <a
          className="w-fit text-sm font-semibold underline"
          href={trainingPlaceMapUrl(place)}
          rel="noreferrer"
          target="_blank"
        >
          Abrir lugar en mapas
        </a>
      ) : null}
      {sharedSession.isLoading ? (
        <p aria-live="polite" className="text-sm text-[var(--text-muted)]">
          Cargando la rutina compartida acordada…
        </p>
      ) : null}
      {sharedSession.isError ? (
        <div
          className="grid justify-items-start gap-2 text-sm text-[var(--danger-text)]"
          role="alert"
        >
          <p>No se pudo cargar la rutina compartida.</p>
          <Button onClick={() => void sharedSession.refetch()} size="sm" variant="secondary">
            Reintentar rutina compartida
          </Button>
        </div>
      ) : null}
      {invitation.state === 'ACCEPTED' &&
      invitation.meeting &&
      revision.mode === 'SHARED_SESSION' &&
      sharedSession.data ? (
        <SharedSessionDetails snapshot={sharedSession.data} />
      ) : null}
      {canAccept ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            loading={responding}
            onClick={() => onRespond(invitation.id, invitation.currentRevision, 'ACCEPT')}
            size="sm"
            variant="primary"
          >
            Aceptar invitación
          </Button>
          <Button
            disabled={responding}
            onClick={() => onRespond(invitation.id, invitation.currentRevision, 'DECLINE')}
            size="sm"
            variant="danger"
          >
            Rechazar
          </Button>
          <span className="text-xs text-[var(--text-muted)]">
            Se confirmará esta revisión y se agregará a tu agenda.
          </span>
        </div>
      ) : null}
      {invitation.state === 'PENDING' && !canAccept ? (
        <p className="text-sm text-[var(--text-muted)]">Esperando respuesta de la otra persona.</p>
      ) : null}
      {invitation.state === 'CANCELLED' || invitation.meeting?.cancelledAt ? (
        <p className="text-sm text-[var(--text-muted)]">
          Este encuentro se canceló. El chat anterior puede no estar disponible.
        </p>
      ) : null}
      {invitation.meeting ? (
        <div className="grid justify-items-start gap-2 border-t border-[var(--border-subtle)] pt-4">
          <Button
            loading={exporting}
            onClick={() => onExport(invitation.id)}
            size="sm"
            variant="secondary"
          >
            Descargar calendario (.ics)
          </Button>
          <p className="text-xs leading-5 text-[var(--text-muted)]">
            La agenda de GymSheet funciona sin permiso de calendario. Para usar otra app, importa
            este archivo manualmente. Si lo vuelves a importar, tu app puede ofrecer actualizar el
            evento existente; revisa su aviso antes de guardar.
          </p>
        </div>
      ) : null}
    </Card>
  );
}

export function TrainingInvitationsClient({ sessionUserId }: Readonly<{ sessionUserId: string }>) {
  const timeZone = useSyncExternalStore(
    subscribeToTimeZone,
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    () => '',
  );
  const [actionError, setActionError] = useState<{ actorId: string; message: string } | null>(null);
  const requestIds = useRef(new Map<string, string>());
  const queryClient = useQueryClient();
  const invitations = useQuery({
    queryKey: invitationsKey(sessionUserId),
    queryFn: trainingInvitationsService.list,
  });

  const respond = useMutation({
    mutationFn: ({
      id,
      revision,
      actorId,
      decision,
    }: {
      id: string;
      revision: number;
      actorId: string;
      decision: 'ACCEPT' | 'DECLINE';
    }) => {
      const key = `${actorId}:${id}:${revision}:${decision}`;
      let clientRequestId = requestIds.current.get(key);
      if (!clientRequestId) {
        clientRequestId = crypto.randomUUID();
        requestIds.current.set(key, clientRequestId);
      }
      return trainingInvitationsService.respond(id, {
        expectedRevision: revision,
        decision,
        clientRequestId,
      });
    },
    onSuccess: async (_result, variables) => {
      requestIds.current.delete(
        `${variables.actorId}:${variables.id}:${variables.revision}:${variables.decision}`,
      );
      setActionError(null);
      await queryClient.invalidateQueries({ queryKey: invitationsKey(variables.actorId) });
    },
    onError: async (error: Error, variables) => {
      setActionError({ actorId: variables.actorId, message: error.message });
      if (error instanceof ApiError && error.status === 409) {
        requestIds.current.delete(
          `${variables.actorId}:${variables.id}:${variables.revision}:${variables.decision}`,
        );
      }
      await queryClient.invalidateQueries({ queryKey: invitationsKey(variables.actorId) });
    },
  });

  const exportCalendar = useMutation({
    mutationFn: ({ id }: { id: string; actorId: string }) =>
      trainingInvitationsService.exportCalendar(id),
    onSuccess: () => setActionError(null),
    onError: (error: Error, variables) =>
      setActionError({ actorId: variables.actorId, message: error.message }),
  });

  const rows = invitations.data ?? [];
  const pending = rows.filter((invitation) => invitation.state === 'PENDING');
  const agenda = rows
    .filter((invitation) => invitation.meeting !== null)
    .sort((a, b) => Date.parse(a.meeting!.startsAt) - Date.parse(b.meeting!.startsAt));
  const history = rows.filter(
    (invitation) => invitation.state !== 'PENDING' && invitation.meeting === null,
  );
  const card = (invitation: ListedTrainingInvitation) => (
    <InvitationCard
      responding={
        respond.isPending &&
        respond.variables?.actorId === sessionUserId &&
        respond.variables?.id === invitation.id
      }
      exporting={
        exportCalendar.isPending &&
        exportCalendar.variables?.actorId === sessionUserId &&
        exportCalendar.variables?.id === invitation.id
      }
      invitation={invitation}
      key={invitation.id}
      onRespond={(id, revision, decision) => {
        setActionError(null);
        if (
          decision === 'DECLINE' &&
          !window.confirm('¿Rechazar esta invitación? Esta acción no se puede deshacer.')
        ) {
          return;
        }
        respond.mutate({ id, revision, actorId: sessionUserId, decision });
      }}
      onExport={(id) => {
        setActionError(null);
        exportCalendar.mutate({ id, actorId: sessionUserId });
      }}
      sessionUserId={sessionUserId}
      timeZone={timeZone}
    />
  );

  return (
    <div className="grid gap-8">
      <PageHeader
        actions={
          <Button onClick={() => invitations.refetch()} size="sm" variant="secondary">
            Actualizar
          </Button>
        }
        description="Revisa las propuestas vigentes y tus encuentros confirmados. Los horarios se muestran en tu zona local."
        eyebrow="Comunidad"
        title="Entrenar juntos"
      />
      {timeZone ? (
        <p className="text-sm text-[var(--text-muted)]">Horarios en {timeZone}.</p>
      ) : null}
      {actionError?.actorId === sessionUserId ? (
        <p role="alert" className="text-sm text-[var(--danger-text)]">
          {actionError.message}
        </p>
      ) : null}
      {invitations.isLoading ? <SkeletonList rows={3} variant="stacked" /> : null}
      {invitations.isError ? (
        <ErrorPanel message={invitations.error.message} onRetry={() => invitations.refetch()} />
      ) : null}
      {invitations.isSuccess && rows.length === 0 ? (
        <EmptyState
          action={
            <Link className="text-sm font-semibold underline" href="/comunidad">
              Ver comunidad
            </Link>
          }
          description="Invita a una conexión desde su perfil o desde el chat."
          title="Todavía no tienes invitaciones"
        />
      ) : null}
      {invitations.isSuccess && pending.length > 0 ? (
        <section aria-labelledby="pending-training-invitations" className="grid gap-3">
          <h2 className="text-xl font-semibold" id="pending-training-invitations">
            Invitaciones pendientes
          </h2>
          {pending.map(card)}
        </section>
      ) : null}
      {invitations.isSuccess && agenda.length > 0 ? (
        <section aria-labelledby="training-agenda" className="grid gap-3">
          <h2 className="text-xl font-semibold" id="training-agenda">
            Agenda
          </h2>
          {agenda.map(card)}
        </section>
      ) : null}
      {invitations.isSuccess && history.length > 0 ? (
        <section aria-labelledby="training-history" className="grid gap-3">
          <h2 className="text-xl font-semibold" id="training-history">
            Historial
          </h2>
          {history.map(card)}
        </section>
      ) : null}
    </div>
  );
}
