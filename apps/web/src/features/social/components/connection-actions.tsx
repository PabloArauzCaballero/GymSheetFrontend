'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MailOpen, MessageCircle, UserPlus, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { chatService } from '@/features/chat/services/chat-service';
import { interactionKeys } from '@/features/interactions/services/interactions-service';
import { socialService } from '@/features/social/services/social-service';
import type { GymDirectoryEntry } from '@/shared/api/schemas';
import { queryKeys } from '@/shared/api/query-keys';
import { Button } from '@/shared/components/ui/button';
import { notify } from '@/shared/notifications';
import { directoryKeys } from '@/features/social/services/directory-keys';

/**
 * Las tres mutaciones que resuelven una relación con otro socio: pedir
 * conexión, escribir y retirar la petición.
 *
 * Viven juntas en un hook porque las tres invalidan exactamente lo mismo —el
 * directorio, las conexiones y los contadores— y porque las usan cuatro
 * superficies distintas (las filas y las tarjetas del directorio, la ficha
 * ampliada y el perfil del socio). Repetirlas en cada una es cómo acaban
 * refrescando cosas distintas y una pantalla se queda con datos viejos.
 */
export function useConnectionActions() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: directoryKeys.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.connections }),
      queryClient.invalidateQueries({ queryKey: interactionKeys.counts }),
    ]);

  const connect = useMutation({
    mutationFn: (userId: string) => socialService.sendConnection(userId),
    onSuccess: async () => {
      await refresh();
      notify.success('Solicitud enviada.');
    },
    onError: (error: Error) => notify.error(error),
  });

  const message = useMutation({
    mutationFn: (userId: string) => chatService.startConversation(userId),
    onSuccess: (conversation) => router.push(`/chat/${conversation.conversationId}`),
    onError: (error: Error) => notify.error(error),
  });

  const withdraw = useMutation({
    mutationFn: (connectionId: string) => socialService.withdrawConnection(connectionId),
    onSuccess: async () => {
      await refresh();
      notify.success('Solicitud retirada.');
    },
    onError: (error: Error) => notify.error(error),
  });

  return { connect, message, withdraw };
}

export type ConnectionActions = ReturnType<typeof useConnectionActions>;

/**
 * El botón que resuelve el estado de conexión de una ficha.
 *
 * Cuatro estados y cuatro respuestas distintas — y el cuarto no es un botón:
 * cuando es la otra persona quien escribió, la decisión no se toma aquí sino en
 * Solicitudes, así que lo que se pinta es un aviso que lleva allí. Un botón de
 * «Conectar» sobre alguien que ya te escribió crearía una segunda solicitud en
 * sentido contrario, que es exactamente lo que el backend rechaza.
 */
export function ConnectionActionButton({
  actions,
  entry,
  variant = 'wide',
}: Readonly<{
  actions: ConnectionActions;
  entry: Pick<GymDirectoryEntry, 'userId' | 'displayName' | 'connectionStatus' | 'connectionId'>;
  /** `wide`: botón con texto. `compact`: sólo el glifo, para una fila. */
  variant?: 'wide' | 'compact';
}>) {
  const { connect, message, withdraw } = actions;
  const compact = variant === 'compact';
  const size = compact ? 'icon' : 'md';
  const className = compact ? undefined : 'w-full';

  if (entry.connectionStatus === 'NONE') {
    return (
      <Button
        aria-label={compact ? `Conectar con ${entry.displayName}` : undefined}
        className={className}
        loading={connect.isPending && connect.variables === entry.userId}
        onClick={() => connect.mutate(entry.userId)}
        size={size}
        variant="primary"
      >
        <UserPlus aria-hidden className="size-4" />
        {compact ? null : 'Conectar'}
      </Button>
    );
  }

  if (entry.connectionStatus === 'ACCEPTED') {
    return (
      <Button
        aria-label={compact ? `Enviar mensaje a ${entry.displayName}` : undefined}
        className={className}
        loading={message.isPending && message.variables === entry.userId}
        onClick={() => message.mutate(entry.userId)}
        size={size}
        variant="primary"
      >
        <MessageCircle aria-hidden className="size-4" />
        {compact ? null : 'Enviar mensaje'}
      </Button>
    );
  }

  if (entry.connectionStatus === 'PENDING_SENT') {
    return (
      <Button
        aria-label={
          compact ? `Cancelar la invitación de conexión a ${entry.displayName}` : undefined
        }
        className={className}
        disabled={!entry.connectionId}
        loading={withdraw.isPending && withdraw.variables === entry.connectionId}
        onClick={() => entry.connectionId && withdraw.mutate(entry.connectionId)}
        size={size}
        variant="secondary"
      >
        <XCircle aria-hidden className="size-4" />
        {compact ? null : 'Cancelar invitación de conexión'}
      </Button>
    );
  }

  return (
    <p
      className={
        compact
          ? 'grid size-10 place-items-center rounded-full bg-[var(--surface-high)] text-[var(--accent-ink)]'
          : 'inline-flex w-full items-center justify-center gap-2 py-2 text-sm font-semibold text-[var(--accent-ink)]'
      }
      title="Te escribió — revísalo en Solicitudes"
    >
      <MailOpen aria-hidden className="size-4" />
      {compact ? (
        <span className="sr-only">Te escribió — revísalo en Solicitudes</span>
      ) : (
        'Te escribió — revísalo en Solicitudes'
      )}
    </p>
  );
}
