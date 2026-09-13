'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { chatService } from '@/features/chat/services/chat-service';
import { MemberProfileDialog } from '@/features/social/components/member-profile-dialog';
import { socialService } from '@/features/social/services/social-service';
import { directoryKeys } from '@/features/social/services/directory-keys';
import {
  interactionKeys,
  interactionsService,
} from '@/features/interactions/services/interactions-service';
import type { InteractionCounts, LikeReceived, LikeSent } from '@/shared/api/schemas';
import { queryKeys } from '@/shared/api/query-keys';
import { Button } from '@/shared/components/ui/button';
import { notify } from '@/shared/notifications';
import { InteractionPhotoCard, MatchOverlay } from './interaction-photo-card';
import { ListSurface } from './list-surface';
import { Segmented } from './segmented';

type Scope = 'received' | 'sent';

/** Techo de las listas. El backend valida `max(50)`: pedir más devuelve 400. */
const LIST_LIMIT = 50;

/**
 * Quién me dio like, y a quién se lo di yo.
 *
 * Un like recibido es una solicitud de conexión pendiente: por eso las acciones
 * son aceptar y rechazar, las mismas del punto 11, y no un «me gusta de vuelta»
 * que dejaría dos modelos distintos para la misma relación.
 *
 * Las decisiones son optimistas, con un matiz que no es casual: rechazar saca
 * la ficha de la lista, y aceptar la deja en su sitio con la conexión ya marcada,
 * porque es ahí donde aparece la celebración. Sacarla también al aceptar dejaría
 * el «¡Conectados!» sin tarjeta debajo.
 */
export function LikesPanel({ counts }: Readonly<{ counts: InteractionCounts | null }>) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [scope, setScope] = useState<Scope>('received');
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  /**
   * A quién acabamos de conectar, confirmado por el servidor. Vive en estado
   * local y no en la caché porque es un momento, no un dato: la tarjeta celebra
   * hasta que se pulsa «Listo». Nunca se marca antes de que la mutación
   * responda — celebrar un match que el backend todavía no ha concedido sería
   * inventarse el resultado.
   */
  const [matchedIds, setMatchedIds] = useState<string[]>([]);

  const received = useQuery({
    queryKey: interactionKeys.likesReceived,
    queryFn: () => interactionsService.likesReceived(LIST_LIMIT),
    enabled: scope === 'received',
  });
  const sent = useQuery({
    queryKey: interactionKeys.likesSent,
    queryFn: () => interactionsService.likesSent(LIST_LIMIT),
    enabled: scope === 'sent',
  });
  const active = scope === 'received' ? received : sent;

  const refreshSocial = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: interactionKeys.counts }),
      queryClient.invalidateQueries({ queryKey: queryKeys.connections }),
      queryClient.invalidateQueries({ queryKey: directoryKeys.all }),
    ]);

  const respond = useMutation({
    mutationFn: (vars: { connectionId: string; userId: string; action: 'ACCEPT' | 'REJECT' }) =>
      socialService.respondConnection(vars.connectionId, vars.action),
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: interactionKeys.likesReceived });
      const previous = queryClient.getQueryData<LikeReceived[]>(interactionKeys.likesReceived);
      queryClient.setQueryData<LikeReceived[]>(interactionKeys.likesReceived, (current) => {
        const list = current ?? [];
        if (vars.action === 'REJECT') {
          return list.filter((entry) => entry.connectionId !== vars.connectionId);
        }
        return list.map((entry) =>
          entry.connectionId === vars.connectionId
            ? { ...entry, connectionStatus: 'ACCEPTED' as const }
            : entry,
        );
      });
      return { previous };
    },
    onError: (error: Error, _vars, context) => {
      // Vuelta atrás exacta y el mensaje que dio el backend. Nada de «no se
      // pudo completar la acción».
      if (context) queryClient.setQueryData(interactionKeys.likesReceived, context.previous);
      notify.error(error);
    },
    onSuccess: (connection, vars) => {
      if (vars.action === 'REJECT') {
        notify.success('Like descartado.');
        return;
      }
      if (connection.status === 'ACCEPTED') {
        setMatchedIds((ids) => (ids.includes(vars.userId) ? ids : [...ids, vars.userId]));
      }
    },
    onSettled: () => void refreshSocial(),
  });

  const withdraw = useMutation({
    mutationFn: (connectionId: string) => socialService.withdrawConnection(connectionId),
    onMutate: async (connectionId) => {
      await queryClient.cancelQueries({ queryKey: interactionKeys.likesSent });
      const previous = queryClient.getQueryData<LikeSent[]>(interactionKeys.likesSent);
      queryClient.setQueryData<LikeSent[]>(interactionKeys.likesSent, (current) =>
        (current ?? []).filter((entry) => entry.connectionId !== connectionId),
      );
      return { previous };
    },
    onError: (error: Error, _connectionId, context) => {
      if (context) queryClient.setQueryData(interactionKeys.likesSent, context.previous);
      notify.error(error);
    },
    onSuccess: () => notify.success('Like retirado.'),
    onSettled: () => void refreshSocial(),
  });

  const openChat = useMutation({
    mutationFn: (userId: string) => chatService.startConversation(userId),
    onSuccess: (conversation) => router.push(`/chat/${conversation.conversationId}`),
    onError: (error: Error) => notify.error(error),
  });

  /** Cerrar la celebración: la ficha ya no está pendiente, así que se relee. */
  const dismissMatch = (userId: string) => {
    setMatchedIds((ids) => ids.filter((id) => id !== userId));
    void queryClient.invalidateQueries({ queryKey: interactionKeys.likesReceived });
  };

  const items = active.data ?? [];

  return (
    <div className="grid gap-5">
      <Segmented
        onChange={setScope}
        options={[
          {
            value: 'received',
            label: 'Me dieron like',
            count: received.data?.length ?? counts?.likesReceived,
          },
          { value: 'sent', label: 'Di like', count: sent.data?.length ?? counts?.likesSent },
        ]}
        value={scope}
      />
      <ListSurface
        empty={items.length === 0}
        emptyDescription={
          scope === 'received'
            ? 'Cuando alguien te dé like desde Descubrir, aparecerá aquí para que decidas.'
            : 'Entra en Descubrir y desliza a la derecha a quien te interese; tus likes pendientes se listan aquí.'
        }
        emptyTitle={scope === 'received' ? 'Todavía nadie' : 'No enviaste ningún like'}
        errorMessage={active.isError ? active.error.message : null}
        loading={active.isLoading}
        onRetry={() => active.refetch()}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {scope === 'received'
            ? (received.data ?? []).map((like) => (
                <InteractionPhotoCard
                  actions={
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        loading={
                          respond.isPending &&
                          respond.variables?.connectionId === like.connectionId &&
                          respond.variables.action === 'ACCEPT'
                        }
                        onClick={() =>
                          respond.mutate({
                            action: 'ACCEPT',
                            connectionId: like.connectionId,
                            userId: like.userId,
                          })
                        }
                        variant="primary"
                      >
                        <Check aria-hidden className="size-4" />
                        Aceptar
                      </Button>
                      <Button
                        loading={
                          respond.isPending &&
                          respond.variables?.connectionId === like.connectionId &&
                          respond.variables.action === 'REJECT'
                        }
                        onClick={() =>
                          respond.mutate({
                            action: 'REJECT',
                            connectionId: like.connectionId,
                            userId: like.userId,
                          })
                        }
                        variant="secondary"
                      >
                        <X aria-hidden className="size-4" />
                        Rechazar
                      </Button>
                    </div>
                  }
                  entry={like}
                  key={like.userId}
                  onOpenProfile={() => setProfileUserId(like.userId)}
                  overlay={
                    matchedIds.includes(like.userId) ? (
                      <MatchOverlay
                        displayName={like.displayName}
                        onDismiss={() => dismissMatch(like.userId)}
                        onOpenChat={() => openChat.mutate(like.userId)}
                        openingChat={openChat.isPending && openChat.variables === like.userId}
                      />
                    ) : undefined
                  }
                  timestamp={like.likedAt}
                />
              ))
            : (sent.data ?? []).map((like) => (
                <InteractionPhotoCard
                  actions={
                    <Button
                      loading={withdraw.isPending && withdraw.variables === like.connectionId}
                      onClick={() => withdraw.mutate(like.connectionId)}
                      variant="secondary"
                    >
                      Retirar el like
                    </Button>
                  }
                  entry={like}
                  key={like.userId}
                  onOpenProfile={() => setProfileUserId(like.userId)}
                  timestamp={like.likedAt}
                />
              ))}
        </div>
      </ListSurface>
      <MemberProfileDialog onClose={() => setProfileUserId(null)} userId={profileUserId} />
    </div>
  );
}
