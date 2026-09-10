import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { Message } from '@gymsheet/schemas';
import { env } from '@/config/env';
import { chatService } from '@/api/services';

export type ChatSocketConnectionState = 'connecting' | 'connected' | 'disconnected';

type JoinAck = { joined: boolean };
type SendAck = { ok: boolean; error?: string };
export type PresenceUpdate = { userId: string; online: boolean; lastSeenAt: string | null };
/** `userId` es quien entregó/leyó — el check de mis propios mensajes se pinta comparando contra esto. */
export type ReceiptUpdate = { userId: string; deliveredAt?: string; readAt?: string };

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
) {
  const socketRef = useRef<Socket | null>(null);
  const onMessageRef = useRef(onMessage);
  const onPresenceRef = useRef(onPresence);
  const onReceiptRef = useRef(onReceipt);
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
    socket.on('disconnect', () => setConnectionState('disconnected'));
    socket.on('message:new', (message: Message) => onMessageRef.current(message));
    socket.on('presence:update', (presence: PresenceUpdate) => onPresenceRef.current?.(presence));
    socket.on('message:delivered', (receipt: { userId: string; deliveredAt: string }) =>
      onReceiptRef.current?.(receipt),
    );
    socket.on('message:read', (receipt: { userId: string; readAt: string }) => onReceiptRef.current?.(receipt));

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const joinConversation = useCallback((conversationId: string): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!socketRef.current) {
        resolve(false);
        return;
      }
      socketRef.current.emit('conversation:join', { conversationId }, (ack: JoinAck) =>
        resolve(ack?.joined ?? false),
      );
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

  return { connectionState, joinConversation, sendMessage };
}
