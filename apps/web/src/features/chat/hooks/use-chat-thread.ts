'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  useChatSocket,
  type PresenceUpdate,
  type ReceiptUpdate,
} from '@/features/chat/hooks/use-chat-socket';
import { chatService } from '@/features/chat/services/chat-service';
import { dedupeById, mergeMessages } from '@/features/chat/lib/merge-messages';
import { useChatSend } from '@/features/chat/hooks/use-chat-send';
import type { Message } from '@/shared/api/schemas';
import { queryKeys } from '@/shared/api/query-keys';
import { notify } from '@/shared/notifications';

/** Mensajes por página. El backend admite hasta 100 y devuelve los más recientes. */
const PAGE_SIZE = 40;

/**
 * Todo lo que un hilo de chat necesita saber y hacer.
 *
 * Vive aparte de la pantalla porque son dos trabajos distintos: aquí está la
 * conversación como *dato* —tres orígenes de mensajes, el socket, los cursores
 * de lectura, la paginación hacia atrás y los cuatro tipos de envío—, y allí
 * sólo su maquetado. Mezclarlos dejaba un fichero donde da miedo tocar nada.
 *
 * Las tres fuentes se mezclan al leer y no se copian a un único estado:
 * `olderMessages` (páginas pedidas hacia atrás), la consulta de historial y lo
 * que llega por el socket. Copiarlas crearía dos verdades que sincronizar.
 */
export function useChatThread({
  conversationId,
  socketOrigin,
}: {
  conversationId: string;
  socketOrigin: string;
}) {
  const queryClient = useQueryClient();
  /** A qué conversación se unió el socket **actual**; se limpia al caerse. */
  const joinedRef = useRef<string | null>(null);
  /** Hubo una caída: al reconectar hay que recuperar lo que el socket no vio. */
  const reconnectedRef = useRef(false);
  const markedReadRef = useRef<string | null>(null);

  const [liveMessages, setLiveMessages] = useState<Message[]>([]);
  const [olderMessages, setOlderMessages] = useState<Message[]>([]);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [reachedStart, setReachedStart] = useState(false);
  const [livePresence, setLivePresence] = useState<PresenceUpdate | null>(null);
  const [liveReceipt, setLiveReceipt] = useState<ReceiptUpdate | null>(null);
  // Vista única: la URL real sólo llega una vez del backend, así que se guarda
  // aquí para poder seguir mostrándola durante esta sesión de pantalla.
  const [revealedMedia, setRevealedMedia] = useState<Record<string, string>>({});

  const history = useQuery({
    queryKey: queryKeys.messages(conversationId),
    queryFn: () => chatService.listMessages(conversationId, { limit: PAGE_SIZE }),
  });
  // El historial no trae el nombre ni la foto de la otra persona: salen de la
  // lista de conversaciones, ya en caché si se llegó navegando desde /chat.
  const conversations = useQuery({
    queryKey: queryKeys.conversations,
    queryFn: chatService.listConversations,
  });
  const conversation = conversations.data?.find(
    (item) => item.conversationId === conversationId,
  );
  const otherUserId = conversation?.otherUserId;

  const onMessage = useCallback(
    (incoming: Message) => {
      if (incoming.conversationId !== conversationId) return;
      setLiveMessages((current) => mergeMessages(current, incoming));
    },
    [conversationId],
  );
  const onPresence = useCallback(
    (presence: PresenceUpdate) => {
      if (presence.userId !== otherUserId) return;
      setLivePresence(presence);
    },
    [otherUserId],
  );
  const onReceipt = useCallback(
    (receipt: ReceiptUpdate) => {
      if (receipt.userId !== otherUserId) return;
      setLiveReceipt(receipt);
    },
    [otherUserId],
  );

  const { connectionState, joinConversation, sendMessage } = useChatSocket(socketOrigin, {
    onMessage,
    onPresence,
    onReceipt,
  });

  /**
   * Cambiar de hilo sin desmontar la pantalla.
   *
   * La ruta es la misma y sólo cambia el parámetro, así que sin este reinicio
   * los mensajes del hilo anterior se quedarían mezclados con los nuevos. Se
   * ajusta durante el render —el patrón que admite React y que ya usa
   * `DomainImage` en este proyecto— y no en un efecto: un efecto corre
   * *después* del pintado, de modo que habría un fotograma con la conversación
   * nueva en la cabecera y las burbujas de la anterior debajo.
   *
   * Las dos referencias no se tocan aquí, y no hace falta: ambas guardan un
   * valor que **contiene** el identificador de la conversación, así que al
   * cambiar de hilo dejan de coincidir por sí solas — `joinedRef` provoca un
   * `conversation:join` nuevo y `markedReadRef` un marcado de leído nuevo.
   */
  const [threadIdentity, setThreadIdentity] = useState(conversationId);
  if (threadIdentity !== conversationId) {
    setThreadIdentity(conversationId);
    setLiveMessages([]);
    setOlderMessages([]);
    setReachedStart(false);
    setRevealedMedia({});
  }

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
    joinedRef.current = conversationId;
    void joinConversation(conversationId);
    // Mientras el socket estuvo caído pudieron llegar mensajes que nadie vio;
    // el historial es la única forma de recuperarlos.
    if (reconnectedRef.current) {
      reconnectedRef.current = false;
      void queryClient.invalidateQueries({ queryKey: queryKeys.messages(conversationId) });
    }
  }, [connectionState, conversationId, joinConversation, queryClient]);

  const messages = useMemo(
    () => dedupeById([olderMessages, history.data ?? [], liveMessages]),
    [history.data, liveMessages, olderMessages],
  );
  const latestMessageId = messages.at(-1)?.id;

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

  // Una primera página corta ya es todo el hilo: no hay nada anterior que pedir.
  const hasMoreOlder = !reachedStart && (history.data?.length ?? 0) >= PAGE_SIZE;
  const oldestLoadedAt = messages[0]?.createdAt ?? null;

  const loadOlderMessages = async () => {
    if (!oldestLoadedAt || loadingOlder || !hasMoreOlder) return;
    setLoadingOlder(true);
    try {
      const page = await chatService.listMessages(conversationId, {
        limit: PAGE_SIZE,
        before: oldestLoadedAt,
      });
      // Una página incompleta significa que se llegó al principio del hilo.
      if (page.length < PAGE_SIZE) setReachedStart(true);
      if (page.length) setOlderMessages((current) => dedupeById([page, current]));
    } catch (error: unknown) {
      notify.error(
        error instanceof Error ? error : new Error('No se pudieron cargar los mensajes anteriores.'),
      );
    } finally {
      setLoadingOlder(false);
    }
  };

  // El snapshot REST es lo primero que se ve; en cuanto llega un evento en vivo
  // por el socket (la misma cuenta que abrió o cerró) ese pasa a mandar.
  const matchingPresence = livePresence?.userId === otherUserId ? livePresence : null;

  const setNickname = useMutation({
    mutationFn: (nickname: string | null) => chatService.setNickname(conversationId, nickname),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.conversations });
      notify.success('Apodo guardado.');
    },
    onError: (error: Error) => notify.error(error),
  });

  /**
   * Un envío propio entra en la vista sin esperar a que el socket lo reemita —
   * si además llega por el socket, `mergeMessages` lo descarta por id.
   */
  const showOwnMessage = (message: Message) =>
    setLiveMessages((current) => mergeMessages(current, message));

  const send = useChatSend({ conversationId, sendOverSocket: sendMessage, showOwnMessage });

  const revealViewOnce = useMutation({
    mutationFn: (messageId: string) => chatService.viewMessage(conversationId, messageId),
    onSuccess: (revealed) => {
      if (!revealed.mediaUrl) return;
      const url = revealed.mediaUrl;
      setRevealedMedia((current) => ({ ...current, [revealed.id]: url }));
    },
    onError: (error: Error) => notify.error(error),
  });

  return {
    connectionState,
    conversation,
    hasMoreOlder,
    history,
    latestMessageId,
    loadOlderMessages,
    loadingOlder,
    messages,
    otherLastDeliveredAt:
      liveReceipt?.deliveredAt ??
      liveReceipt?.readAt ??
      conversation?.otherUserLastDeliveredAt ??
      null,
    otherLastReadAt: liveReceipt?.readAt ?? conversation?.otherUserLastReadAt ?? null,
    otherLastSeenAt: matchingPresence?.lastSeenAt ?? conversation?.otherUserLastSeenAt ?? null,
    otherOnline: matchingPresence?.online ?? conversation?.otherUserOnline ?? false,
    revealViewOnce,
    revealedMedia,
    sendLocation: send.sendLocation,
    sendMedia: send.sendMedia,
    sendText: send.sendText,
    sending: send.sending,
    sendingMedia: send.sendingMedia,
    setNickname,
  };
}
