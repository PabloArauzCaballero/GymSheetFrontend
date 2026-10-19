'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  useChatSocket,
  type MessageDeletedEvent,
  type ReceiptUpdate,
} from '@/features/chat/hooks/use-chat-socket';
import { chatService } from '@/features/chat/services/chat-service';
import { dedupeById, mergeMessages } from '@/features/chat/lib/merge-messages';
import { applyMessageUpdated } from '@/features/chat/lib/message-edit';
import { useChatMessageMutations } from '@/features/chat/hooks/use-chat-message-mutations';
import { useResumeValidation } from '@/features/chat/hooks/use-resume-validation';
import { useMarkRead } from '@/features/chat/hooks/use-mark-read';
import { useChatPresence } from '@/features/chat/hooks/use-chat-presence';
import { useChatRoom } from '@/features/chat/hooks/use-chat-room';
import { useChatSend } from '@/features/chat/hooks/use-chat-send';
import { receiptCursors } from '@/features/chat/lib/receipt-cursors';
import { applyMessageDeleted } from '@/features/chat/lib/apply-message-deleted';
import { asDeletedMessage } from '@/features/chat/lib/as-deleted-message';
import { applyReceiptUpdate, type LiveReceiptState } from '@/features/chat/lib/apply-receipt-update';
import type { Message } from '@/shared/api/schemas';
import { queryKeys } from '@/shared/api/query-keys';
import { ApiError } from '@/shared/api/api-error';
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
  const resumeValidation = useResumeValidation(conversationId, queryClient);

  const [liveMessages, setLiveMessages] = useState<Message[]>([]);
  const [olderMessages, setOlderMessages] = useState<Message[]>([]);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [reachedStart, setReachedStart] = useState(false);
  const [liveReceiptState, setLiveReceiptState] = useState<LiveReceiptState>(null);
  /** Consent barriers are scoped to each conversation and live until an explicit post-change REST request succeeds. */
  const receiptBarriersRef = useRef(new Map<string, number>());
  const receiptBarrierSequenceRef = useRef(0);
  const [conversationRevoked, setConversationRevoked] = useState(false);
  const [historyUnavailableFor, setHistoryUnavailableFor] = useState<string | null>(null);
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
    (event: MessageDeletedEvent) =>
      applyMessageDeleted(event, {
        conversationId,
        queryClient,
        deletedEventsRef,
        setDeletedEvents,
        setLiveMessages,
        setOlderMessages,
        setRevealedMedia,
      }),
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
  const { onPresence, matchingPresence } = useChatPresence(otherUserId);
  const receiptContext = useMemo(
    () => ({
      conversationId,
      queryClient,
      receiptBarriersRef,
      receiptBarrierSequenceRef,
      setConversationRevoked,
      setLiveMessages,
      setOlderMessages,
      setRevealedMedia,
      setLiveReceiptState,
    }),
    [conversationId, queryClient],
  );
  const onReceipt = useCallback(
    (receipt: ReceiptUpdate) => applyReceiptUpdate(receipt, otherUserId, receiptContext),
    [otherUserId, receiptContext],
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

  useChatRoom({
    connectionState,
    conversationId,
    joinConversation,
    leaveConversation,
    queryClient,
  });

  const messages = useMemo(
    () => conversationUnavailable || isValidatingHistory ? [] :
      dedupeById([olderMessages, history.data ?? [], liveMessages]).map((message) =>
        deletedEvents.has(message.id) ? asDeletedMessage(message) : message,
      ),
    [conversationUnavailable, deletedEvents, history.data, isValidatingHistory, liveMessages, olderMessages],
  );
  const latestMessageId = messages.at(-1)?.id;

  useMarkRead(conversationId, latestMessageId);

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

  const { setNickname, editMessage, revealViewOnce } = useChatMessageMutations({
    conversationId,
    deletedEventsRef,
    onMessageUpdated,
    queryClient,
    setRevealedMedia,
  });

  /**
   * Un envío propio entra en la vista sin esperar a que el socket lo reemita —
   * si además llega por el socket, `mergeMessages` lo descarta por id.
   */
  const showOwnMessage = (message: Message) =>
    setLiveMessages((current) => mergeMessages(current, message));

  const send = useChatSend({ conversationId, sendOverSocket: sendMessage, showOwnMessage });

  const deliveredAt = conversation?.otherUserLastDeliveredAt;
  const readAt = conversation?.otherUserLastReadAt;
  const readSinceAt = conversation?.otherUserReadReceiptsSinceAt;
  const cursors = useMemo(
    () => receiptCursors({ deliveredAt, readAt, readSinceAt }, liveReceipt),
    [deliveredAt, readAt, readSinceAt, liveReceipt],
  );

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
    ...cursors,
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
