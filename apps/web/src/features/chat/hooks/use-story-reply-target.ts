'use client';

import { useEffect, useRef, useState } from 'react';
import type { Message } from '@/shared/api/schemas';

/**
 * Cuando se abre el hilo desde la respuesta a una story, busca ese mensaje
 * página a página hacia atrás (máx. 20), lo centra y le da el foco. Devuelve el
 * texto de estado que la pantalla anuncia mientras busca o si no lo encuentra.
 */
export function useStoryReplyTarget({
  storyReplyMessageId,
  conversationUnavailable,
  hasMoreOlder,
  historyLoading,
  isValidatingHistory,
  loadOlderMessages,
  loadingOlder,
  messages,
}: Readonly<{
  storyReplyMessageId: string | undefined;
  conversationUnavailable: boolean;
  hasMoreOlder: boolean;
  historyLoading: boolean;
  isValidatingHistory: boolean;
  loadOlderMessages: () => unknown;
  loadingOlder: boolean;
  messages: readonly Message[];
}>): string {
  const replySearchRef = useRef<{ id: string; pages: number; before: string | null } | null>(null);
  const [replyTargetStatus, setReplyTargetStatus] = useState('');

  useEffect(() => {
    if (!storyReplyMessageId) {
      replySearchRef.current = null;
      return;
    }
    let search = replySearchRef.current;
    if (!search || search.id !== storyReplyMessageId) {
      search = { id: storyReplyMessageId, pages: 0, before: null };
      replySearchRef.current = search;
      setReplyTargetStatus('Buscando la respuesta a la story…');
    }
    if (historyLoading || isValidatingHistory || conversationUnavailable) return;

    const target = messages.find((message) => message.id === storyReplyMessageId);
    if (target) {
      const element = document.getElementById(`message-${storyReplyMessageId}`);
      if (!element) return;
      replySearchRef.current = null;
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.focus({ preventScroll: true });
      return;
    }

    if (loadingOlder) return;
    const before = messages[0]?.createdAt ?? null;
    if (!hasMoreOlder || !before || search.pages >= 20 || search.before === before) {
      setReplyTargetStatus('No se encontró la respuesta a la story en las páginas de historial consultadas.');
      return;
    }
    search.pages += 1;
    search.before = before;
    setReplyTargetStatus('Buscando la respuesta a la story en mensajes anteriores…');
    void loadOlderMessages();
  }, [
    storyReplyMessageId,
    conversationUnavailable,
    hasMoreOlder,
    historyLoading,
    isValidatingHistory,
    loadOlderMessages,
    loadingOlder,
    messages,
  ]);

  return replyTargetStatus;
}
