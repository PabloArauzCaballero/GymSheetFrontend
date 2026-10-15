import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { Message } from '@gymsheet/schemas';
import { env } from '@/config/env';
import { chatService } from '@/api/services';
import type { MessageDeletedEvent } from './chat-message-deletion';
import { isForActiveConversation } from './chat-socket-routing';

export type ChatSocketConnectionState = 'connecting' | 'connected' | 'disconnected';

type JoinAck = { joined: boolean };
type LeaveAck = { left: boolean };
type SendAck = { ok: boolean; error?: string };
export type PresenceUpdate = { userId: string; online: boolean; lastSeenAt: string | null };
/** `userId` es quien entregó/leyó — el check de mis propios mensajes se pinta comparando contra esto. */
export type ReceiptUpdate = { conversationId: string; userId: string; deliveredAt?: string; readAt?: string; readFrom?: string | null; settingsChanged?: boolean; conversationRevoked?: boolean };

/** `env.apiUrl` incluye el prefijo de la API (`/api/v1`); el socket conecta contra el origen solo. */
function backendOrigin(): string {
  return new URL(env.apiUrl).origin;
}

/**
 * Un socket por hilo de chat abierto, autenticado con un boleto de un solo
 * uso — igual que en la web, aunque el móvil ya tenga el JWT en
 * SecureStore: un único camino de autenticación en el gateway. `auth` como
 * función se re-ejecuta en cada intento de conexión, incluidas las
 * reconexiones automáticas de Socket.IO.
 */
export function useChatSocket(
  onMessage: (message: Message) => void,
  onPresence?: (presence: PresenceUpdate) => void,
  onReceipt?: (receipt: ReceiptUpdate) => void,
  onMessageDeleted?: (event: MessageDeletedEvent) => void,
  onMessageUpdated?: (message: Message) => void,
) {
  const socketRef = useRef<Socket | null>(null);
  const activeConversationRef = useRef<string | null>(null);
  const joinedConversationRef = useRef<string | null>(null);
  const onMessageRef = useRef(onMessage);
  const onPresenceRef = useRef(onPresence);
  const onReceiptRef = useRef(onReceipt);
  const onMessageDeletedRef = useRef(onMessageDeleted);
  const onMessageUpdatedRef = useRef(onMessageUpdated);
  const [connectionState, setConnectionState] = useState<ChatSocketConnectionState>('connecting');

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    onPresenceRef.current = onPresence;
  }, [onPresence]);

  useEffect(() => {
    onReceiptRef.current = onReceipt;
  }, [onReceipt]);

  useEffect(() => {
    onMessageDeletedRef.current = onMessageDeleted;
  }, [onMessageDeleted]);

  useEffect(() => {
    onMessageUpdatedRef.current = onMessageUpdated;
  }, [onMessageUpdated]);

  useEffect(() => {
    const socket = io(`${backendOrigin()}/chat`, {
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
      joinedConversationRef.current = null;
      setConnectionState('disconnected');
    });
    socket.on('message:new', (message: Message) => {
      if (isForActiveConversation(message, activeConversationRef.current)) onMessageRef.current(message);
    });
    socket.on('message:deleted', (event: MessageDeletedEvent) => {
      if (isForActiveConversation(event, activeConversationRef.current)) onMessageDeletedRef.current?.(event);
    });
    socket.on('message:updated', (message: Message) => {
      if (isForActiveConversation(message, activeConversationRef.current)) onMessageUpdatedRef.current?.(message);
    });
    socket.on('presence:update', (presence: PresenceUpdate) => onPresenceRef.current?.(presence));
    socket.on('message:delivered', (receipt: { conversationId: string; userId: string; deliveredAt: string }) => {
      if (isForActiveConversation(receipt, activeConversationRef.current)) onReceiptRef.current?.(receipt);
    });
    socket.on('message:read', (receipt: { conversationId: string; userId: string; readAt: string; readFrom?: string | null }) => {
      if (isForActiveConversation(receipt, activeConversationRef.current)) onReceiptRef.current?.(receipt);
    });
    socket.on('read-receipts:changed', (receipt: { conversationId: string; userId: string; version?: number }) => {
      if (isForActiveConversation(receipt, activeConversationRef.current)) {
        onReceiptRef.current?.({ ...receipt, settingsChanged: true });
      }
    });
    socket.on('conversation:revoked', (event: { conversationId: string; byUserId: string }) => {
      if (isForActiveConversation(event, activeConversationRef.current)) {
        onReceiptRef.current?.({ conversationId: event.conversationId, userId: event.byUserId, conversationRevoked: true });
      }
    });

    return () => {
      const joinedConversationId = joinedConversationRef.current;
      if (joinedConversationId) {
        socket.emit('conversation:leave', { conversationId: joinedConversationId });
      }
      socket.disconnect();
      socketRef.current = null;
      activeConversationRef.current = null;
      joinedConversationRef.current = null;
    };
  }, []);

  const joinConversation = useCallback((conversationId: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const socket = socketRef.current;
      if (!socket) {
        resolve(false);
        return;
      }
      activeConversationRef.current = conversationId;
      socket.emit('conversation:join', { conversationId }, (ack: JoinAck) => {
        if (ack?.joined && activeConversationRef.current === conversationId && socketRef.current === socket) {
          joinedConversationRef.current = conversationId;
          resolve(true);
          return;
        }
        if (ack?.joined) {
          socket.emit('conversation:leave', { conversationId }, (_leaveAck: LeaveAck) => {
            if (socketRef.current === socket && joinedConversationRef.current === conversationId) {
              joinedConversationRef.current = null;
            }
          });
        }
        resolve(false);
      });
    });
  }, []);

  const leaveConversation = useCallback((conversationId: string): void => {
    const socket = socketRef.current;
    if (activeConversationRef.current === conversationId) activeConversationRef.current = null;
    if (joinedConversationRef.current === conversationId) joinedConversationRef.current = null;
    socket?.emit('conversation:leave', { conversationId }, (_ack: LeaveAck) => {
      if (socketRef.current === socket && joinedConversationRef.current === conversationId) {
        joinedConversationRef.current = null;
      }
    });
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
