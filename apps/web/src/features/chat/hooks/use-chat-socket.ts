'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { Message } from '@/shared/api/schemas';
import { chatService } from '../services/chat-service';

export type ChatSocketConnectionState = 'connecting' | 'connected' | 'disconnected';

type JoinAck = { joined: boolean };
type SendAck = { ok: boolean; error?: string };

/**
 * Un socket por sesión de chat abierta, autenticado con un boleto de un solo
 * uso (nunca el JWT: el navegador solo habla con rutas BFF). `auth` como
 * función se re-ejecuta en cada intento de conexión, incluidas las
 * reconexiones automáticas de Socket.IO — así cada intento pide un boleto
 * fresco en vez de reintentar uno ya consumido.
 *
 * `socketOrigin` llega como propiedad desde el servidor y no del bundle: la
 * dirección del backend es un dato del despliegue, no de la imagen. Ver
 * `shared/config/backend-origin.ts`.
 */
export function useChatSocket(socketOrigin: string, onMessage: (message: Message) => void) {
  const socketRef = useRef<Socket | null>(null);
  const onMessageRef = useRef(onMessage);
  const [connectionState, setConnectionState] = useState<ChatSocketConnectionState>('connecting');

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
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
    socket.on('disconnect', () => setConnectionState('disconnected'));
    socket.on('message:new', (message: Message) => onMessageRef.current(message));

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [socketOrigin]);

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
