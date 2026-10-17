'use client';

import type { QueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import type { useChatSocket } from '@/features/chat/hooks/use-chat-socket';
import { queryKeys } from '@/shared/api/query-keys';

type Socket = ReturnType<typeof useChatSocket>;

/** Mantiene al socket dentro de la sala de la conversación abierta. */
export function useChatRoom({
  connectionState,
  conversationId,
  joinConversation,
  leaveConversation,
  queryClient,
}: Readonly<{
  connectionState: Socket['connectionState'];
  conversationId: string;
  joinConversation: Socket['joinConversation'];
  leaveConversation: Socket['leaveConversation'];
  queryClient: QueryClient;
}>): void {
  /** A qué conversación se unió el socket **actual**; se limpia al caerse. */
  const joinedRef = useRef<string | null>(null);
  /** Hubo una caída: al reconectar hay que recuperar lo que el socket no vio. */
  const reconnectedRef = useRef(false);

  // Reconectar crea un socket nuevo que no pertenece a ninguna sala: sin
  // re-emitir `conversation:join` el hilo queda mudo para siempre.
  useEffect(() => {
    if (connectionState === 'disconnected') {
      joinedRef.current = null;
      reconnectedRef.current = true;
      return;
    }
    if (connectionState !== 'connected') return;
    if (joinedRef.current === conversationId) return;
    if (joinedRef.current) {
      leaveConversation(joinedRef.current);
      joinedRef.current = null;
    }
    joinedRef.current = conversationId;
    void joinConversation(conversationId);
    // Mientras el socket estuvo caído pudieron llegar mensajes que nadie vio;
    // el historial es la única forma de recuperarlos.
    if (reconnectedRef.current) {
      reconnectedRef.current = false;
      void queryClient.invalidateQueries({ queryKey: queryKeys.messages(conversationId) });
    }
  }, [connectionState, conversationId, joinConversation, leaveConversation, queryClient]);
}
