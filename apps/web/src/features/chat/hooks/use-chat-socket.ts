'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { Message } from '@/shared/api/schemas';
import { chatService } from '../services/chat-service';

export type ChatSocketConnectionState = 'connecting' | 'connected' | 'disconnected';

type JoinAck = { joined: boolean };
type SendAck = { ok: boolean; error?: string };

export type PresenceUpdate = { userId: string; online: boolean; lastSeenAt: string | null };
/**
 * `userId` es quien entregó o leyó — nunca el autor del mensaje. El check de
 * los mensajes propios se pinta comparando su `createdAt` contra estas marcas.
 */
export type ReceiptUpdate = {
  conversationId: string;
  userId: string;
  deliveredAt?: string;
  readAt?: string;
  readFrom?: string | null;
  settingsChanged?: boolean;
  conversationRevoked?: boolean;
};
export type MessageDeletedEvent = {
  conversationId: string;
  messageId: string;
  scope: 'EVERYONE';
  deletedAt: string;
};

type ChatSocketHandlers = {
  onMessage: (message: Message) => void;
  onMessageUpdated?: (message: Message) => void;
  onMessageDeleted?: (event: MessageDeletedEvent) => void;
  onPresence?: (presence: PresenceUpdate) => void;
  onReceipt?: (receipt: ReceiptUpdate) => void;
};

/**
 * Un socket por sesión de chat abierta, autenticado con un boleto de un solo
 * uso (nunca el JWT: el navegador solo habla con rutas BFF). `auth` como
 * función se re-ejecuta en cada intento de conexión, incluidas las
 * reconexiones automáticas de Socket.IO — así cada intento pide un boleto
 * fresco en vez de reintentar uno ya consumido.
 *
 * Escucha los cuatro eventos que el gateway emite, no sólo `message:new`. Los
 * otros tres —presencia, entregado y leído— ya viajaban por el cable y la web
 * los descartaba: el hilo no sabía si la otra persona estaba conectada ni si
 * había leído nada, mientras el móvil sí.
 *
 * `socketOrigin` llega como propiedad desde el servidor y no del bundle: la
 * dirección del backend es un dato del despliegue, no de la imagen. Ver
 * `shared/config/backend-origin.ts`.
 */
export function useChatSocket(socketOrigin: string, handlers: ChatSocketHandlers) {
  const socketRef = useRef<Socket | null>(null);
  const joinedConversationsRef = useRef(new Set<string>());
  const desiredConversationRef = useRef<string | null>(null);
  const handlersRef = useRef(handlers);
  const [connectionState, setConnectionState] = useState<ChatSocketConnectionState>('connecting');

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    const joinedConversations = joinedConversationsRef.current;
    const socket = io(`${socketOrigin}/chat`, {
      transports: ['websocket'],
      auth: (callback: (data: object) => void) => {
        chatService
          .issueSocketTicket()
          .then((ticket) => callback({ ticket: ticket.ticket }))
          .catch(() => callback({}));
      },
    });
    socketRef.current = socket;
    socket.on('connect', () => setConnectionState('connected'));
    socket.on('disconnect', () => {
      joinedConversations.clear();
      desiredConversationRef.current = null;
      setConnectionState('disconnected');
    });
    socket.on('message:new', (message: Message) => handlersRef.current.onMessage(message));
    socket.on('message:updated', (message: Message) => handlersRef.current.onMessageUpdated?.(message));
    socket.on('message:deleted', (event: MessageDeletedEvent) =>
      handlersRef.current.onMessageDeleted?.(event),
    );
    socket.on('presence:update', (presence: PresenceUpdate) =>
      handlersRef.current.onPresence?.(presence),
    );
    socket.on('message:delivered', (receipt: { conversationId: string; userId: string; deliveredAt: string }) =>
      handlersRef.current.onReceipt?.(receipt),
    );
    socket.on('message:read', (receipt: { conversationId: string; userId: string; readAt: string; readFrom?: string | null }) =>
      handlersRef.current.onReceipt?.(receipt),
    );
    socket.on('read-receipts:changed', (receipt: { conversationId: string; userId: string }) =>
      handlersRef.current.onReceipt?.({ ...receipt, settingsChanged: true }),
    );
    socket.on('conversation:revoked', (event: { conversationId: string; byUserId: string }) =>
      handlersRef.current.onReceipt?.({
        conversationId: event.conversationId,
        userId: event.byUserId,
        conversationRevoked: true,
      }),
    );

    return () => {
      for (const conversationId of joinedConversations) {
        socket.emit('conversation:leave', { conversationId });
      }
      joinedConversations.clear();
      desiredConversationRef.current = null;
      socket.disconnect();
      socketRef.current = null;
    };
  }, [socketOrigin]);

  const joinConversation = useCallback((conversationId: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const socket = socketRef.current;
      if (!socket) {
        resolve(false);
        return;
      }
      desiredConversationRef.current = conversationId;
      socket.emit('conversation:join', { conversationId }, (ack: JoinAck) => {
        const joined = ack?.joined ?? false;
        if (!joined) {
          resolve(false);
          return;
        }

        if (socketRef.current === socket && desiredConversationRef.current === conversationId) {
          joinedConversationsRef.current.add(conversationId);
          resolve(true);
          return;
        }

        // A join can finish after navigation already left its room. The server
        // may have processed the join anyway, so undo it on the same socket.
        socket.emit('conversation:leave', { conversationId });
        resolve(false);
      });
    });
  }, []);

  const leaveConversation = useCallback((conversationId: string): void => {
    if (desiredConversationRef.current === conversationId) desiredConversationRef.current = null;
    socketRef.current?.emit('conversation:leave', { conversationId });
    joinedConversationsRef.current.delete(conversationId);
  }, []);

  const sendMessage = useCallback((conversationId: string, body: string): Promise<SendAck> => {
    return new Promise((resolve) => {
      if (!socketRef.current) {
        resolve({ ok: false, error: 'disconnected' });
        return;
      }
      socketRef.current.emit('message:send', { conversationId, body }, (ack: SendAck) => resolve(ack));
    });
  }, []);

  return { connectionState, joinConversation, leaveConversation, sendMessage };
}
