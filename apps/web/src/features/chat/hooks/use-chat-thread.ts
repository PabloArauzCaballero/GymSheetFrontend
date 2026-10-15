'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  useChatSocket,
  type MessageDeletedEvent,
  type PresenceUpdate,
  type ReceiptUpdate,
} from '@/features/chat/hooks/use-chat-socket';
import { chatService } from '@/features/chat/services/chat-service';
import { dedupeById, mergeMessages } from '@/features/chat/lib/merge-messages';
import { applyMessageUpdated } from '@/features/chat/lib/message-edit';
import { useChatSend } from '@/features/chat/hooks/use-chat-send';
import type { Message } from '@/shared/api/schemas';
import { queryKeys } from '@/shared/api/query-keys';
import { ApiError } from '@/shared/api/api-error';
import { notify } from '@/shared/notifications';

/** Mensajes por página. El backend admite hasta 100 y devuelve los más recientes. */
const PAGE_SIZE = 40;

function asDeletedMessage(message: Message, deletedAt = message.deletedAt ?? null): Message {
  if (message.type === 'system') return message;
  return {
    ...message,
    body: 'Mensaje eliminado',
    type: 'text',
    mediaUrl: null,
    mediaMimeType: null,
    viewOnce: false,
    viewed: false,
    locationLat: null,
    locationLng: null,
    deletedAt,
  };
}

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
  const [liveReceiptState, setLiveReceiptState] = useState<{
    conversationId: string;
    receipt: ReceiptUpdate;
  } | null>(null);
  /** Consent barriers are scoped to each conversation and live until an explicit post-change REST request succeeds. */
  const receiptBarriersRef = useRef(new Map<string, number>());
  const receiptBarrierSequenceRef = useRef(0);
  const [conversationRevoked, setConversationRevoked] = useState(false);
  const [historyUnavailableFor, setHistoryUnavailableFor] = useState<string | null>(null);
  const [resumeValidation, setResumeValidation] = useState<{
    conversationId: string;
    sequence: number;
  } | null>(null);
  const resumeValidationSequenceRef = useRef(0);
  /** Tombstones persist for this mounted thread so stale sources cannot restore a deleted payload. */
  const deletedEventsRef = useRef(new Map<string, MessageDeletedEvent>());
  const [deletedEvents, setDeletedEvents] = useState<Map<string, MessageDeletedEvent>>(
    () => new Map(),
  );
  // Vista única: la URL real sólo llega una vez del backend, así que se guarda
  // aquí para poder seguir mostrándola durante esta sesión de pantalla.
  const [revealedMedia, setRevealedMedia] = useState<Record<string, string>>({});

  const history = useQuery({
    queryKey: queryKeys.messages(conversationId),
    queryFn: () => chatService.listMessages(conversationId, { limit: PAGE_SIZE }),
  });
  const historyNotFound = history.error instanceof ApiError && history.error.status === 404;
  if (historyNotFound && historyUnavailableFor !== conversationId) {
    setHistoryUnavailableFor(conversationId);
    setLiveMessages([]);
    setOlderMessages([]);
    setRevealedMedia({});
  }
  const historyUnavailable = historyUnavailableFor === conversationId;
  const isValidatingHistory = resumeValidation?.conversationId === conversationId;
  const conversationUnavailable = conversationRevoked || historyUnavailable || historyNotFound;

  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        const sequence = ++resumeValidationSequenceRef.current;
        setResumeValidation({ conversationId, sequence });
        void queryClient
          .invalidateQueries(
            { queryKey: queryKeys.messages(conversationId) },
            { throwOnError: true },
          )
          .catch(() => undefined)
          .finally(() => {
            setResumeValidation((current) => (current?.sequence === sequence ? null : current));
          });
      }
    };
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => document.removeEventListener('visibilitychange', refreshWhenVisible);
  }, [conversationId, queryClient]);

  useEffect(() => {
    if (!historyNotFound) return;
    queryClient.setQueryData(queryKeys.messages(conversationId), []);
  }, [conversationId, historyNotFound, queryClient]);
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
  const liveReceipt =
    liveReceiptState?.conversationId === conversationId ? liveReceiptState.receipt : null;

  const onMessage = useCallback(
    (incoming: Message) => {
      if (incoming.conversationId !== conversationId) return;
      const deletedEvent = deletedEventsRef.current.get(incoming.id);
      setLiveMessages((current) => mergeMessages(
        current,
        deletedEvent ? asDeletedMessage(incoming, deletedEvent.deletedAt) : incoming,
      ));
    },
    [conversationId],
  );
  const onMessageDeleted = useCallback(
    (event: MessageDeletedEvent) => {
      if (event.conversationId !== conversationId || event.scope !== 'EVERYONE') return;
      deletedEventsRef.current.set(event.messageId, event);
      setDeletedEvents(new Map(deletedEventsRef.current));
      const sanitize = (items: Message[]) =>
        items.map((message) =>
          message.id === event.messageId ? asDeletedMessage(message, event.deletedAt) : message,
        );
      setLiveMessages(sanitize);
      setOlderMessages(sanitize);
      queryClient.setQueryData<Message[] | undefined>(
        queryKeys.messages(conversationId),
        (current) => (current ? sanitize(current) : current),
      );
      setRevealedMedia((current) => {
        if (!(event.messageId in current)) return current;
        const next = { ...current };
        delete next[event.messageId];
        return next;
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.messages(conversationId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.conversations });
    },
    [conversationId, queryClient],
  );
  const onMessageUpdated = useCallback(
    async (updated: Message) => {
      if (
        updated.conversationId !== conversationId ||
        conversationUnavailable ||
        deletedEventsRef.current.has(updated.id)
      ) return;
      await queryClient.cancelQueries({ queryKey: queryKeys.messages(conversationId), exact: true });
      setLiveMessages((current) => applyMessageUpdated(current, updated, conversationId));
      setOlderMessages((current) => applyMessageUpdated(current, updated, conversationId));
      queryClient.setQueryData<Message[] | undefined>(
        queryKeys.messages(conversationId),
        (current) => current ? applyMessageUpdated(current, updated, conversationId) : current,
      );
    },
    [conversationId, conversationUnavailable, queryClient],
  );
  const isMessageDeleted = useCallback(
    (messageId: string) => deletedEventsRef.current.has(messageId),
    [],
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
      if (receipt.conversationId !== conversationId) return;
      if (receipt.conversationRevoked) {
        setConversationRevoked(true);
        setLiveMessages([]);
        setOlderMessages([]);
        setRevealedMedia({});
        setLiveReceiptState((current) =>
          current?.conversationId === conversationId ? null : current,
        );
        queryClient.setQueryData(queryKeys.messages(conversationId), []);
        void queryClient.invalidateQueries({ queryKey: queryKeys.conversations });
        notify.success('La conversación se cerró y el historial dejó de estar disponible.');
        return;
      }
      if (receipt.settingsChanged) {
        // Reciprocity means either participant changing consent invalidates the
        // previously public read cursor, including when this account changed it.
        const barrier = ++receiptBarrierSequenceRef.current;
        receiptBarriersRef.current.set(conversationId, barrier);
        setLiveReceiptState({ conversationId, receipt });
        void queryClient.invalidateQueries({ queryKey: ['chat', 'read-receipts'] });
        void (async () => {
          await queryClient.cancelQueries({ queryKey: queryKeys.conversations });
          const freshConversations = await chatService.listConversations();
          if (receiptBarriersRef.current.get(conversationId) !== barrier) return;
          queryClient.setQueryData(queryKeys.conversations, freshConversations);
          queryClient.setQueryData(['chat', 'conversations'], freshConversations);
          receiptBarriersRef.current.delete(conversationId);
          setLiveReceiptState((current) => {
            if (current?.conversationId !== conversationId || !current.receipt.settingsChanged) {
              return current;
            }
            if (current.receipt.deliveredAt) {
              return {
                conversationId,
                receipt: {
              conversationId,
                  userId: current.receipt.userId,
                  deliveredAt: current.receipt.deliveredAt,
                },
              };
            }
            return null;
          });
        })().catch(() => undefined);
        return;
      }
      if (receipt.userId !== otherUserId) return;
      if (receiptBarriersRef.current.has(conversationId)) {
        if (receipt.deliveredAt) {
          // Delivery remains available, but must not replace the invalidation
          // marker that suppresses the stale public read cursor.
          setLiveReceiptState({
            conversationId,
            receipt: {
              conversationId,
              userId: receipt.userId,
              deliveredAt: receipt.deliveredAt,
              settingsChanged: true,
            },
          });
        }
        // The event has no server sequence/version, so hold public read updates
        // until the canonical conversation summary has been fetched again.
        return;
      }
      setLiveReceiptState({ conversationId, receipt });
    },
    [conversationId, otherUserId, queryClient],
  );

  const { connectionState, joinConversation, leaveConversation, sendMessage } = useChatSocket(socketOrigin, {
    onMessage,
    onMessageUpdated,
    onMessageDeleted,
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
    setConversationRevoked(false);
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

  const messages = useMemo(
    () => conversationUnavailable || isValidatingHistory ? [] :
      dedupeById([olderMessages, history.data ?? [], liveMessages]).map((message) =>
        deletedEvents.has(message.id) ? asDeletedMessage(message) : message,
      ),
    [conversationUnavailable, deletedEvents, history.data, isValidatingHistory, liveMessages, olderMessages],
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
  const oldestLoadedId = messages[0]?.id ?? null;

  const loadOlderMessages = async () => {
    if (!oldestLoadedAt || !oldestLoadedId || loadingOlder || !hasMoreOlder) return;
    setLoadingOlder(true);
    try {
      const page = await chatService.listMessages(conversationId, {
        limit: PAGE_SIZE,
        before: oldestLoadedAt,
        beforeId: oldestLoadedId ?? undefined,
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

  const editMessage = useMutation({
    mutationFn: ({ messageId, body }: { messageId: string; body: string }) =>
      chatService.editMessage(conversationId, messageId, body),
    onSuccess: onMessageUpdated,
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
      if (!revealed.mediaUrl || deletedEventsRef.current.has(revealed.id)) return;
      const url = revealed.mediaUrl;
      setRevealedMedia((current) => ({ ...current, [revealed.id]: url }));
    },
    onError: (error: Error) => notify.error(error),
  });

  return {
    connectionState,
    conversation,
    conversationUnavailable,
    isValidatingHistory,
    conversationRevoked,
    isMessageDeleted,
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
    otherLastReadAt: liveReceipt?.settingsChanged
      ? null
      : liveReceipt?.readAt ?? conversation?.otherUserLastReadAt ?? null,
    otherReadReceiptsSinceAt: liveReceipt?.settingsChanged
      ? null
      : liveReceipt?.readAt
        ? liveReceipt.readFrom ?? null
        : conversation?.otherUserReadReceiptsSinceAt ?? null,
    otherLastSeenAt: matchingPresence?.lastSeenAt ?? conversation?.otherUserLastSeenAt ?? null,
    otherOnline: matchingPresence?.online ?? conversation?.otherUserOnline ?? false,
    revealViewOnce,
    revealedMedia: conversationUnavailable || isValidatingHistory ? {} : revealedMedia,
    sendLocation: send.sendLocation,
    sendMedia: send.sendMedia,
    sendText: send.sendText,
    sending: send.sending,
    sendingMedia: send.sendingMedia,
    setNickname,
    editMessage,
  };
}
