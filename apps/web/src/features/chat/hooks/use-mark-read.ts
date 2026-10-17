'use client';

import { useEffect, useRef } from 'react';
import { chatService } from '@/features/chat/services/chat-service';

/** Marca la conversación como leída con cada mensaje nuevo visible. */
export function useMarkRead(conversationId: string, latestMessageId: string | undefined): void {
  const markedReadRef = useRef<string | null>(null);

  // Abrir la conversación (o recibir un mensaje mientras está abierta) es
  // haberla leído — se re-marca por cada mensaje nuevo, no sólo al montar. La
  // clave es el último mensaje y no el total, para que cargar páginas
  // anteriores no dispare marcados que no corresponden.
  useEffect(() => {
    if (!latestMessageId) return;
    const key = `${conversationId}:${latestMessageId}`;
    if (markedReadRef.current === key) return;
    markedReadRef.current = key;
    void chatService.markRead(conversationId).catch(() => undefined);
  }, [conversationId, latestMessageId]);
}
