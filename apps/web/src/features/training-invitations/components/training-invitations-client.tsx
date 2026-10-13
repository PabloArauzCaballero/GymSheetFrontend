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
import { trainingInvitationsService, type ListedTrainingInvitation } from '../services/training-invitations-service';
import { InvitationCard } from './training-invitation-card';

const invitationsKey = (sessionUserId: string) => ['training-invitations', sessionUserId] as const;
const subscribeToTimeZone = () => () => {};

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
