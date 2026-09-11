'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { MemberProfileDialog } from '@/features/social/components/member-profile-dialog';
import { socialService } from '@/features/social/services/social-service';
import {
  interactionKeys,
  interactionsService,
} from '@/features/interactions/services/interactions-service';
import type { InteractionCounts } from '@/shared/api/schemas';
import { queryKeys } from '@/shared/api/query-keys';
import { Button } from '@/shared/components/ui/button';
import { notify } from '@/shared/notifications';
import { ListSurface } from './list-surface';
import { PersonCard } from './person-card';
import { Segmented } from './segmented';

type Scope = 'received' | 'sent';

/**
 * Quién me dio like, y a quién se lo di yo.
 *
 * Un like recibido es una solicitud de conexión pendiente: por eso las
 * acciones son aceptar y rechazar, las mismas del punto 11, y no un «me gusta
 * de vuelta» que dejaría dos modelos distintos para la misma relación.
 */
export function LikesPanel({ counts }: Readonly<{ counts: InteractionCounts | null }>) {
  const queryClient = useQueryClient();
  const [scope, setScope] = useState<Scope>('received');
  const [profileUserId, setProfileUserId] = useState<string | null>(null);

  const received = useQuery({
    queryKey: interactionKeys.likesReceived,
    queryFn: () => interactionsService.likesReceived(),
    enabled: scope === 'received',
  });
  const sent = useQuery({
    queryKey: interactionKeys.likesSent,
    queryFn: () => interactionsService.likesSent(),
    enabled: scope === 'sent',
  });
  const active = scope === 'received' ? received : sent;

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: interactionKeys.likesReceived }),
      queryClient.invalidateQueries({ queryKey: interactionKeys.likesSent }),
      queryClient.invalidateQueries({ queryKey: interactionKeys.counts }),
      queryClient.invalidateQueries({ queryKey: queryKeys.connections }),
    ]);
  };

  const respond = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'ACCEPT' | 'REJECT' }) =>
      socialService.respondConnection(id, action),
    onSuccess: async (_result, variables) => {
      await refresh();
      notify.success(variables.action === 'ACCEPT' ? '¡Conectados!' : 'Solicitud rechazada.');
    },
    onError: (error: Error) => notify.error(error),
  });

  const withdraw = useMutation({
    mutationFn: (id: string) => socialService.withdrawConnection(id),
    onSuccess: async () => {
      await refresh();
      notify.success('Like retirado.');
    },
    onError: (error: Error) => notify.error(error),
  });

  return (
    <div className="grid gap-5">
      <Segmented
        onChange={setScope}
        options={[
          { value: 'received', label: 'Me dieron like', count: counts?.likesReceived },
          { value: 'sent', label: 'Di like', count: counts?.likesSent },
        ]}
        value={scope}
      />
      <ListSurface
        empty={(active.data ?? []).length === 0}
        emptyDescription={
          scope === 'received'
            ? 'Cuando alguien te dé like, aparecerá aquí para que decidas.'
            : 'Los likes que envíes se quedan aquí hasta que la otra persona responda.'
        }
        emptyTitle={scope === 'received' ? 'Todavía sin likes' : 'No enviaste ningún like'}
        errorMessage={active.isError ? active.error.message : null}
        loading={active.isLoading}
        onRetry={() => active.refetch()}
      >
        {scope === 'received'
          ? (received.data ?? []).map((like) => (
              <PersonCard
                actions={
                  <>
                    <Button
                      loading={respond.isPending && respond.variables?.id === like.connectionId}
                      onClick={() => respond.mutate({ id: like.connectionId, action: 'ACCEPT' })}
                      size="sm"
                      variant="primary"
                    >
                      Aceptar
                    </Button>
                    <Button
                      loading={respond.isPending && respond.variables?.id === like.connectionId}
                      onClick={() => respond.mutate({ id: like.connectionId, action: 'REJECT' })}
                      size="sm"
                      variant="secondary"
                    >
                      Rechazar
                    </Button>
                  </>
                }
                entry={like}
                key={like.userId}
                onSelect={() => setProfileUserId(like.userId)}
                timestamp={like.likedAt}
              />
            ))
          : (sent.data ?? []).map((like) => (
              <PersonCard
                actions={
                  <Button
                    loading={withdraw.isPending && withdraw.variables === like.connectionId}
                    onClick={() => withdraw.mutate(like.connectionId)}
                    size="sm"
                    variant="secondary"
                  >
                    Retirar
                  </Button>
                }
                entry={like}
                key={like.userId}
                onSelect={() => setProfileUserId(like.userId)}
                timestamp={like.likedAt}
              />
            ))}
      </ListSurface>
      <MemberProfileDialog onClose={() => setProfileUserId(null)} userId={profileUserId} />
    </div>
  );
}
