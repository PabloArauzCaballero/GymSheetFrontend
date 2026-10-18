import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  StatusBar,
  Text,
  View,
  type ListRenderItemInfo,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { ChatComposer } from '@/features/chat/chat-composer';
import type { AttachKind } from '@/features/chat/chat-attach-menu';
import { ChatHeader } from '@/features/chat/chat-header';
import { DaySeparator, SystemNotice } from '@/features/chat/chat-rows';
import {
  ContactInfoSheet,
  DeleteMessageSheet,
  MessageActionsSheet,
} from '@/features/chat/chat-sheets';
import { ChatWallpaper } from '@/features/chat/chat-wallpaper';
import { MessageBubble, type Receipt } from '@/features/chat/message-bubble';
import { MessageMedia, resolveChatMediaUrl, type RevealedMedia } from '@/features/chat/message-content';
import { ScrollToLatestButton } from '@/features/chat/scroll-to-latest';
import { useMediaAccessToken } from '@/features/chat/use-media-access-token';
import { useVoiceNote } from '@/features/chat/use-voice-note';
import { MediaPreview, type PickedMedia } from '@/features/chat/media-preview';
import {
  canDeleteForEveryone,
  isTombstone,
  messageActions,
  tombstoneLabel,
  type MessageAction,
} from '@/hooks/chat-message-actions';
import { applyReactions, myReaction, nextReaction, withReaction } from '@/hooks/chat-reactions';
import { messagePreviewText, replyAuthorLabel } from '@/hooks/chat-reply';
import { buildChatRows, rowIndexOf, type ChatRow } from '@/hooks/chat-timeline';
import EmojiPicker from 'rn-emoji-keyboard';
import type { ConversationSummary, Message, MessageReactionsUpdate } from '@gymsheet/schemas';
import { chatSystemEventMessage, isMessageReadByOther } from '@gymsheet/domain';
import {
  applyMessageDeleted,
  mergeIncomingMessage,
  sanitizeDeletedMessages,
} from '@/hooks/chat-message-deletion';
import { applyKnownMessageUpdates, applyMessageUpdated, canEditMessage } from '@/hooks/chat-message-edit';
import { patchChatMessageCache } from '@/hooks/chat-message-edit-cache';
import {
  applyReceiptUpdate,
  beginReceiptSettingsChange,
  confirmReceiptSettingsChange,
  createReceiptPolicyState,
  isRelevantReceiptUpdate,
  latestReceiptCutoff,
  receiptSettingsAffectConversation,
  visibleReceiptReadAt,
  type ReceiptPolicyState,
} from '@/hooks/chat-receipt-settings';
import { isForActiveConversation } from '@/hooks/chat-socket-routing';
import {
  cachedMessagesWhileAccessPending,
  canWriteWhileHistoryAccessPending,
  historyCacheReplacementForError,
  isChatHistoryNotFound,
  recoverFromHistoryError,
  viewerUriWhileHistoryAccessPending,
} from '@/hooks/chat-history-recovery';
import { chatService, moderationService } from '@/api/services';
import { useChatSocket, type PresenceUpdate, type TypingUpdate } from '@/hooks/use-chat-socket';
import { BackLink } from '@/components/nav';
import { ScrollScreen, useResponsive } from '@/components/layout';
import { CreateTrainingInviteModal } from '@/features/training-invitations/create-training-invite-modal';
import { useReduceMotion } from '@/notifications/use-reduce-motion';
import { EmptyState, ErrorState, Skeleton } from '@/components/feedback';
import { notify } from '@/notifications';
import { useAuthStore } from '@/state/auth-store';
import { presenceLabel } from '@/lib/format';
import { storyReferenceLabel } from '@/lib/story-reference-presentation';
import {
  colors,
  fontSizes,
  maxContentWidth,
  maxWideContentWidth,
  overlay,
  radii,
  spacing,
} from '@/theme';

/**
 * Mensajes por página. El backend admite hasta 100 y devuelve los más
 * recientes; una página que llena de sobra una pantalla evita que abrir el
 * chat cueste el hilo entero, y `before` trae el resto al subir.
 */
const PAGE_SIZE = 40;

/** Por debajo de esto (en puntos desde el último mensaje) se considera que se está al día. */
const AT_BOTTOM_OFFSET = 160;
/** «Escribiendo…» se reenvía cada pocos segundos mientras se teclea y caduca solo si deja de llegar. */
const TYPING_REFRESH_MS = 3_000;
const TYPING_IDLE_MS = 4_000;
const TYPING_EXPIRY_MS = 6_000;

/** Une los tres orígenes (páginas viejas, página actual, socket) sin repetir ids. */
function dedupeById(groups: Message[][]): Message[] {
  const seen = new Set<string>();
  const ordered: Message[] = [];
  for (const group of groups) {
    for (const message of group) {
      if (seen.has(message.id)) continue;
      seen.add(message.id);
      ordered.push(message);
    }
  }
  return ordered;
}

export default function ChatThreadScreen() {
  const { id: conversationId, storyReplyMessageId: storyReplyMessageIdParam } = useLocalSearchParams<{
    id: string;
    storyReplyMessageId?: string | string[];
  }>();
  const storyReplyMessageId = Array.isArray(storyReplyMessageIdParam)
    ? storyReplyMessageIdParam[0]
    : storyReplyMessageIdParam;
  const currentConversationRef = useRef(conversationId);
  currentConversationRef.current = conversationId;
  const currentUserId = useAuthStore((state) => state.principal?.id);
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const { wide, width } = useResponsive();
  /** A qué conversación se unió el socket **actual**; se limpia al caerse. */
  const joinedRef = useRef<string | null>(null);
  /** Hubo una caída: al reconectar hay que recuperar lo que el socket no vio. */
  const reconnectedRef = useRef(false);
  const markedReadRef = useRef<string | null>(null);
  const listRef = useRef<FlatList<ChatRow>>(null);
  /**
   * El mensaje más reciente que había al abrir el hilo. Sólo lo posterior entra
   * con animación: animar las 40 burbujas de la carga inicial es ruido, y animar
   * las de una página anterior al hacer scroll hacia arriba sería peor. `null`
   * hasta que la primera carga termina, para que esa primera tanda no se anime.
   */
  const newestAtOpen = useRef<string | null>(null);
  const reduceMotion = useReduceMotion();

  const history = useQuery({
    queryKey: ['chat', 'messages', conversationId],
    queryFn: () => chatService.listMessages(conversationId, { limit: PAGE_SIZE }),
    enabled: Boolean(conversationId),
  });
  const conversations = useQuery({
    queryKey: ['chat', 'conversations'],
    queryFn: () => chatService.listConversations(),
  });
  const readReceiptSettings = useQuery({
    queryKey: ['chat', 'read-receipts', conversationId],
    queryFn: () => chatService.getReadReceiptSettings(conversationId),
    enabled: Boolean(conversationId),
  });

  const [liveMessages, setLiveMessages] = useState<Message[]>([]);
  const deletedMessageIdsRef = useRef(new Set<string>());
  const updatedMessagesRef = useRef(new Map<string, Message>());
  const [deletedMessageIds, setDeletedMessageIds] = useState<Set<string>>(() => new Set());
  const [receiptPolicies, setReceiptPolicies] = useState<Record<string, ReceiptPolicyState>>({});
  const receiptPoliciesRef = useRef<Record<string, ReceiptPolicyState>>({});
  const [olderMessages, setOlderMessages] = useState<Message[]>([]);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [reachedStart, setReachedStart] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [livePresence, setLivePresence] = useState<PresenceUpdate | null>(null);
  const [conversationRevoked, setConversationRevoked] = useState(false);
  const unavailableConversationRef = useRef<string | null>(null);
  const [historyAccessPending, setHistoryAccessPending] = useState(false);
  const resumeValidationRef = useRef<{ conversationId: string; dataUpdateCount: number } | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  /** El teclado de emojis se abrió desde «+» de la barra de reacciones: el emoji va al mensaje, no al borrador. */
  const [emojiReactionTarget, setEmojiReactionTarget] = useState<Message | null>(null);
  const [sendingMedia, setSendingMedia] = useState(false);
  /** El desplegable del «+» del redactor. */
  const [attachOpen, setAttachOpen] = useState(false);
  /** Respondiendo citando a este mensaje. */
  const [replyTarget, setReplyTarget] = useState<Message | null>(null);
  /** Mensaje al que se salta desde una cita; se busca en páginas anteriores si hace falta. */
  const [jumpTargetId, setJumpTargetId] = useState<string | null>(null);
  const [otherTyping, setOtherTyping] = useState(false);
  const typingExpiryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingSentAtRef = useRef(0);
  const typingIdleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const atBottomRef = useRef(true);
  const [awayFromBottom, setAwayFromBottom] = useState(false);
  /** Mensajes de la otra persona que llegaron mientras se leía más arriba. */
  const [unreadAway, setUnreadAway] = useState(0);
  const [contactOpen, setContactOpen] = useState(false);
  const [pickedMedia, setPickedMedia] = useState<PickedMedia | null>(null);
  const [actionMessage, setActionMessage] = useState<Message | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Message | null>(null);
  const [hiddenMessageIds, setHiddenMessageIds] = useState<Set<string>>(() => new Set());
  const router = useRouter();
  const [focusedMessageId, setFocusedMessageId] = useState<string | null>(null);
  const [storyReplyNotFound, setStoryReplyNotFound] = useState(false);
  const storyReplySearchRef = useRef<{ id: string; pages: number; before: string | null } | null>(null);
  /** El límite de 2 minutos para la nota de voz y la envía; se asigna más abajo. */
  const voiceLimitRef = useRef<() => void>(() => undefined);
  const voice = useVoiceNote({ onLimitReached: () => voiceLimitRef.current() });
  const finishingVoiceRef = useRef(false);
  const { token: mediaAccessToken, onMediaError } = useMediaAccessToken();
  /** Pide al redactor enfocar el campo (abrir el teclado) — al entrar a editar. */
  const [composerFocusRequest, setComposerFocusRequest] = useState(0);
  /** Lo que se hace cuando la hoja de acciones termina de irse (iOS no presenta dos hojas a la vez). */
  const afterActionsRef = useRef<(() => void) | null>(null);
  /** Reloj para esconder los mensajes temporales que caducan con el chat abierto. */
  const [expiryClock, setExpiryClock] = useState(() => Date.now());
  const [viewerUri, setViewerUri] = useState<string | null>(null);
  // Vista única: la URL real solo llega una vez del backend — se guarda acá
  // para poder volver a mostrarla dentro de esta misma sesión de pantalla.
  const [revealedMedia, setRevealedMedia] = useState<Record<string, RevealedMedia>>({});
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  const otherConversation = conversations.data?.find(
    (conversation) => conversation.conversationId === conversationId,
  );
  const receiptPolicy = receiptPolicies[conversationId] ?? createReceiptPolicyState();

  function updateReceiptPolicy(
    id: string,
    update: (current: ReceiptPolicyState) => ReceiptPolicyState,
  ) {
    const next = {
      ...receiptPoliciesRef.current,
      [id]: update(receiptPoliciesRef.current[id] ?? createReceiptPolicyState()),
    };
    receiptPoliciesRef.current = next;
    setReceiptPolicies(next);
  }

  async function refreshReceiptPolicy(id: string) {
    const settingsKey = ['chat', 'read-receipts', id] as const;
    const conversationsKey = ['chat', 'conversations'] as const;
    const settingsCountBefore = queryClient.getQueryState(settingsKey)?.dataUpdateCount ?? 0;
    const conversationsCountBefore = queryClient.getQueryState(conversationsKey)?.dataUpdateCount ?? 0;
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['chat', 'read-receipts'] }),
      queryClient.invalidateQueries({ queryKey: conversationsKey }),
    ]);
    const refreshedSettings = queryClient.getQueryData<{ enabled: boolean }>(settingsKey);
    const refreshedConversations = queryClient.getQueryData<Array<{
      conversationId: string;
      otherUserLastReadAt: string | null;
      otherUserReadReceiptsSinceAt: string | null;
    }>>(conversationsKey);
    const summary = refreshedConversations?.find((item) => item.conversationId === id);
    const sourceIsFresh =
      (queryClient.getQueryState(settingsKey)?.dataUpdateCount ?? 0) > settingsCountBefore &&
      (queryClient.getQueryState(conversationsKey)?.dataUpdateCount ?? 0) > conversationsCountBefore;
    updateReceiptPolicy(id, (current) => confirmReceiptSettingsChange(
      current,
      refreshedSettings?.enabled,
      summary?.otherUserReadReceiptsSinceAt,
      summary?.otherUserLastReadAt,
      sourceIsFresh,
      otherUserId ?? '',
    ));
  }

  const otherName = otherConversation?.otherUserName;
  const otherPhotoUrl = otherConversation?.otherUserPhotoUrl ?? null;
  const otherUserId = otherConversation?.otherUserId;
  const canWrite = canWriteWhileHistoryAccessPending(
    otherConversation?.canWrite !== false && !conversationRevoked &&
    !isChatHistoryNotFound(history.error) &&
    unavailableConversationRef.current !== conversationId,
    historyAccessPending,
  );
  const displayName = otherConversation?.nickname ?? otherName;
  /** `undefined` mientras la lista de conversaciones carga; un servidor viejo sin el campo cuenta como desactivado. */
  const disappearingSeconds = conversations.data ? (otherConversation?.disappearingSeconds ?? null) : undefined;

  const setNickname = useMutation({
    mutationFn: (nickname: string | null) => chatService.setNickname(conversationId, nickname),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
    },
    onError: (error: Error) => notify.error(error.message),
  });
  const reportMessage = useMutation({
    mutationFn: ({ messageId, reason }: { messageId: string; reason: 'ACOSO' | 'SPAM' | 'OTRO' }) =>
      moderationService.report('CHAT_MESSAGE', messageId, reason),
    onSuccess: () => notify.success('Gracias por avisar. Este chat ya no estará disponible.'),
    onError: (error: Error) => notify.error(error.message),
  });
  /** El modo de mensajes temporales en la lista de conversaciones (de ahí lo leen la cabecera y la ficha). */
  function patchDisappearing(seconds: number | null) {
    queryClient.setQueryData<ConversationSummary[]>(['chat', 'conversations'], (current) =>
      current?.map((conversation) => conversation.conversationId === conversationId
        ? { ...conversation, disappearingSeconds: seconds }
        : conversation),
    );
  }
  const setDisappearing = useMutation({
    mutationFn: (seconds: number | null) => chatService.setDisappearing(conversationId, seconds),
    onSuccess: (result) => {
      patchDisappearing(result.disappearingSeconds);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // El aviso llega por el socket; si el socket no estaba, el historial lo trae.
      void queryClient.invalidateQueries({ queryKey: ['chat', 'messages', conversationId] });
      void queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
    },
    onError: (error: Error) => notify.error(error.message),
  });
  const updateReadReceiptSettings = useMutation({
    mutationFn: chatService.updateReadReceiptSettings,
    onSuccess: async (settings, input) => {
      const affectsOpenConversation = receiptSettingsAffectConversation(input, conversationId);
      // SELECTED returns global settings, not the selected per-conversation override.
      // Only seed this query for scopes whose response describes the open chat.
      if (input.scope === 'ALL' || (input.scope === 'CONVERSATION' && input.conversationId === conversationId)) {
        queryClient.setQueryData(['chat', 'read-receipts', conversationId], settings);
      }
      if (affectsOpenConversation) {
        updateReceiptPolicy(conversationId, (current) => beginReceiptSettingsChange(
          current,
          currentUserId ?? '',
        ));
      }
      if (affectsOpenConversation) {
        await refreshReceiptPolicy(conversationId);
      } else {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['chat', 'read-receipts'] }),
          queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] }),
        ]);
      }
      notify.success('Preferencia de lectura actualizada.');
    },
    onError: async (error: Error) => {
      await queryClient.invalidateQueries({ queryKey: ['chat', 'read-receipts'] });
      notify.error(error.message);
    },
  });

  // El hook guarda estos manejadores en un ref en cada render: no hace falta memorizarlos.
  const socketExtras = {
    onReaction: (update: MessageReactionsUpdate) => {
      if (update.conversationId === currentConversationRef.current) patchReactions(update);
    },
    onTyping: (update: TypingUpdate) => {
      if (update.conversationId !== currentConversationRef.current || update.userId === currentUserId) return;
      if (typingExpiryRef.current) clearTimeout(typingExpiryRef.current);
      setOtherTyping(update.typing);
      if (update.typing) typingExpiryRef.current = setTimeout(() => setOtherTyping(false), TYPING_EXPIRY_MS);
    },
  };

  const { connectionState, joinConversation, leaveConversation, sendMessage, sendTyping } = useChatSocket(
    (incoming) => {
      if (incoming.conversationId !== conversationId || unavailableConversationRef.current === conversationId) return;
      setLiveMessages((current) => mergeIncomingMessage(current, incoming, deletedMessageIdsRef.current));
      if (incoming.type !== 'system' && incoming.senderId !== currentUserId) {
        // Llegó un mensaje: ya no está escribiendo. Si se lee más arriba, cuenta para el botón de bajar.
        setOtherTyping(false);
        if (!atBottomRef.current) setUnreadAway((count) => count + 1);
      }
      if (incoming.type === 'system' && incoming.systemEvent.kind === 'DISAPPEARING_MESSAGES_CHANGED') {
        // El otro cambió los mensajes temporales: la cabecera y la ficha lo reflejan al momento.
        patchDisappearing(incoming.systemEvent.seconds);
      }
    },
    (presence) => {
      if (presence.userId !== otherUserId) return;
      setLivePresence(presence);
    },
    (receipt) => {
      if (!isForActiveConversation(receipt, conversationId)) return;
      if (receipt.conversationRevoked) {
        unavailableConversationRef.current = conversationId;
        setConversationRevoked(true);
        setLiveMessages([]);
        setOlderMessages([]);
        setRevealedMedia({});
        setViewerUri(null);
        queryClient.setQueryData(['chat', 'messages', conversationId], []);
        void queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
        notify.success('La conversación se cerró y el historial dejó de estar disponible.');
        return;
      }
      if (!isRelevantReceiptUpdate(receipt, currentUserId, otherUserId)) return;
      if (receipt.settingsChanged) {
        const settingsConversationId = conversationId;
        updateReceiptPolicy(settingsConversationId, (current) => beginReceiptSettingsChange(
          current,
          receipt.userId,
        ));
        void refreshReceiptPolicy(settingsConversationId);
      } else {
        const hadBarrier = receiptPoliciesRef.current[conversationId]?.awaitingFreshRead ?? false;
        updateReceiptPolicy(conversationId, (current) => applyReceiptUpdate(
          current,
          receipt,
          readReceiptSettings.data?.enabled,
        ));
        if (hadBarrier && receipt.readAt) void refreshReceiptPolicy(conversationId);
      }
    },
    (event) => {
      if (event.scope !== 'EVERYONE' || event.conversationId !== conversationId) return;

      deletedMessageIdsRef.current.add(event.messageId);
      setDeletedMessageIds((current) => new Set(current).add(event.messageId));
      setLiveMessages((current) => applyMessageDeleted(current, event));
      setOlderMessages((current) => applyMessageDeleted(current, event));
      queryClient.setQueryData<Message[]>(['chat', 'messages', conversationId], (current) =>
        current ? applyMessageDeleted(current, event) : current,
      );
      setRevealedMedia((current) => {
        const remaining = { ...current };
        delete remaining[event.messageId];
        return remaining;
      });
      setViewerUri(null);
      void queryClient.cancelQueries({ queryKey: ['chat', 'messages', conversationId] });
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ['chat', 'messages', conversationId] }),
        queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] }),
      ]);
    },
    (updated) => {
      const updatedConversationId = updated.conversationId;
      if (
        updatedConversationId !== conversationId ||
        unavailableConversationRef.current === updatedConversationId ||
        updated.deletedAt ||
        deletedMessageIdsRef.current.has(updated.id)
      ) return;

      updatedMessagesRef.current.set(updated.id, updated);
      setLiveMessages((current) => applyMessageUpdated(current, updated, updatedConversationId, deletedMessageIdsRef.current));
      setOlderMessages((current) => applyMessageUpdated(current, updated, updatedConversationId, deletedMessageIdsRef.current));
      if (editingMessageId === updated.id) {
        setEditingMessageId(null);
        setDraft('');
      }
      void patchChatMessageCache({
        queryClient,
        conversationId: updatedConversationId,
        updated,
        isCurrent: () =>
          currentConversationRef.current === updatedConversationId &&
          unavailableConversationRef.current !== updatedConversationId &&
          !deletedMessageIdsRef.current.has(updated.id),
        getDeletedMessageIds: () => deletedMessageIdsRef.current,
      });
      void queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
    },
    socketExtras,
  );

  // Cambiar de hilo sin desmontar la pantalla (la ruta es la misma, sólo cambia
  // el parámetro) dejaba mensajes del hilo anterior mezclados con los nuevos.
  useEffect(() => {
    const joinedConversationId = conversationId;
    return () => {
      if (joinedRef.current !== joinedConversationId) return;
      leaveConversation(joinedConversationId);
      joinedRef.current = null;
    };
  }, [conversationId, leaveConversation]);

  useEffect(() => {
    setLiveMessages([]);
    setOlderMessages([]);
    setReachedStart(false);
    setConversationRevoked(false);
    setEditingMessageId(null);
    setDraft('');
    setReplyTarget(null);
    setJumpTargetId(null);
    setOtherTyping(false);
    setUnreadAway(0);
    setHistoryAccessPending(false);
    resumeValidationRef.current = null;
    unavailableConversationRef.current = null;
    joinedRef.current = null;
    markedReadRef.current = null;
  }, [conversationId]);

  // Recover missed messages after backgrounding even if the socket stays open.
  useEffect(() => {
    let previousState = AppState.currentState;
    const subscription = AppState.addEventListener('change', (nextState) => {
      const wasBackgrounded = previousState !== 'active';
      previousState = nextState;
      if (!wasBackgrounded || nextState !== 'active' || !conversationId) return;
      const queryKey = ['chat', 'messages', conversationId] as const;
      const dataUpdateCount = queryClient.getQueryState(queryKey)?.dataUpdateCount ?? 0;
      resumeValidationRef.current = { conversationId, dataUpdateCount };
      setHistoryAccessPending(true);
      setViewerUri(null);
      const finishValidation = () => {
        const validation = resumeValidationRef.current;
        if (validation?.conversationId !== conversationId) return;
        const queryState = queryClient.getQueryState(queryKey);
        if (
          queryState?.status === 'error' ||
          (queryState?.dataUpdateCount ?? 0) > validation.dataUpdateCount ||
          queryState?.fetchStatus !== 'fetching'
        ) {
          resumeValidationRef.current = null;
          setHistoryAccessPending(false);
        }
      };
      void queryClient.invalidateQueries({
        queryKey: ['chat', 'messages', conversationId],
        exact: true,
      }).then(finishValidation, finishValidation);
    });
    return () => subscription.remove();
  }, [conversationId, queryClient]);

  // A history 404 is authoritative. Hide cached messages/media and prevent
  // late socket or view-once responses from repopulating this conversation.
  useEffect(() => {
    if (!conversationId || !isChatHistoryNotFound(history.error)) return;
    if (unavailableConversationRef.current === conversationId) return;
    unavailableConversationRef.current = conversationId;
    setConversationRevoked(true);
    const recovered = recoverFromHistoryError({
      history: history.data ?? [],
      olderMessages,
      liveMessages,
      revealedMedia,
      viewerUri,
      unavailable: false,
    }, history.error);
    setLiveMessages(recovered.liveMessages);
    setOlderMessages(recovered.olderMessages);
    setRevealedMedia(recovered.revealedMedia);
    setViewerUri(recovered.viewerUri);
    const cacheReplacement = historyCacheReplacementForError(history.error);
    void queryClient.cancelQueries(
      { queryKey: ['chat', 'messages', conversationId], exact: true },
      { revert: false },
    ).then(() => {
      if (cacheReplacement !== null) {
        queryClient.setQueryData(['chat', 'messages', conversationId], cacheReplacement);
      }
      setHistoryAccessPending(false);
      resumeValidationRef.current = null;
    });
    void queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
  }, [conversationId, history.data, history.error, liveMessages, olderMessages, queryClient, revealedMedia, viewerUri]);

  // Reconectar crea un socket nuevo que no pertenece a ninguna sala: sin
  // re-emitir `conversation:join` el hilo queda mudo para siempre. El ref
  // recuerda a qué conversación se unió este socket y se limpia al caerse.
  useEffect(() => {
    if (connectionState === 'disconnected') {
      joinedRef.current = null;
      reconnectedRef.current = true;
      return;
    }
    if (connectionState !== 'connected' || !conversationId) return;
    if (joinedRef.current === conversationId) return;
    joinedRef.current = conversationId;
    void joinConversation(conversationId);
    // Mientras el socket estuvo caído pudieron llegar mensajes que nadie vio;
    // el historial es la única forma de recuperarlos.
    if (reconnectedRef.current) {
      reconnectedRef.current = false;
      void queryClient.invalidateQueries({ queryKey: ['chat', 'messages', conversationId] });
    }
  }, [connectionState, conversationId, joinConversation, queryClient]);

  /** Del más viejo al más nuevo — el orden natural del hilo. */
  const messages = useMemo(() => {
    if (conversationRevoked || isChatHistoryNotFound(history.error) ||
      unavailableConversationRef.current === conversationId) return [];
    return cachedMessagesWhileAccessPending(dedupeById([
      sanitizeDeletedMessages(olderMessages, deletedMessageIds),
      sanitizeDeletedMessages(history.data ?? [], deletedMessageIds),
      sanitizeDeletedMessages(liveMessages, deletedMessageIds),
    ]), historyAccessPending);
  }, [conversationId, conversationRevoked, deletedMessageIds, history.data, history.error, historyAccessPending, liveMessages, olderMessages]);
  /** La lista se pinta invertida, así que los datos van del más nuevo al más viejo. */
  const timeline = useMemo(
    () => [...messages].reverse().filter((message) =>
      !hiddenMessageIds.has(message.id) &&
      // Un mensaje temporal que caduca con el chat abierto desaparece aquí también.
      !(message.expiresAt && Date.parse(message.expiresAt) <= expiryClock)),
    [expiryClock, hiddenMessageIds, messages],
  );
  const rows = useMemo(() => buildChatRows(timeline), [timeline]);
  const hasTemporaryMessages = messages.some((message) => Boolean(message.expiresAt));
  useEffect(() => {
    if (!hasTemporaryMessages) return;
    const tick = setInterval(() => setExpiryClock(Date.now()), 30_000);
    return () => clearInterval(tick);
  }, [hasTemporaryMessages]);
  const historyLoaded = !history.isPending;
  useEffect(() => {
    if (historyLoaded && newestAtOpen.current === null) {
      newestAtOpen.current = messages[messages.length - 1]?.createdAt ?? '';
    }
  }, [historyLoaded, messages]);

  // Una primera página corta ya es todo el hilo: no hay nada anterior que pedir.
  const hasMoreOlder = !reachedStart && (history.data?.length ?? 0) >= PAGE_SIZE;
  const oldestLoadedAt = messages[0]?.createdAt ?? null;

  const loadOlderMessages = useCallback(async () => {
    if (!conversationId || !oldestLoadedAt || loadingOlder || !hasMoreOlder) return;
    setLoadingOlder(true);
    try {
      const page = await chatService.listMessages(conversationId, {
        limit: PAGE_SIZE,
        before: oldestLoadedAt,
      });
      // Una página incompleta significa que se llegó al principio del hilo.
      if (page.length < PAGE_SIZE) setReachedStart(true);
      if (page.length) {
        const sanitizedPage = applyKnownMessageUpdates(
          sanitizeDeletedMessages(page, deletedMessageIdsRef.current),
          updatedMessagesRef.current,
          conversationId,
          deletedMessageIdsRef.current,
        );
        setOlderMessages((current) => dedupeById([sanitizedPage, current]));
      }
    } catch (error: unknown) {
      notify.error(
        error instanceof Error ? error.message : 'No se pudieron cargar los mensajes anteriores.',
      );
    } finally {
      setLoadingOlder(false);
    }
  }, [conversationId, hasMoreOlder, loadingOlder, oldestLoadedAt]);

  /**
   * Saltar a un mensaje (la cita de una respuesta, o la respuesta a una story
   * que abrió este chat): si no está en lo cargado, trae páginas anteriores
   * hasta encontrarlo (máximo 20) y lo resalta un momento.
   */
  const searchTargetId = jumpTargetId ?? storyReplyMessageId ?? null;
  useEffect(() => {
    if (!searchTargetId) {
      storyReplySearchRef.current = null;
      setStoryReplyNotFound(false);
      return;
    }
    let search = storyReplySearchRef.current;
    if (!search || search.id !== searchTargetId) {
      search = { id: searchTargetId, pages: 0, before: null };
      storyReplySearchRef.current = search;
      setStoryReplyNotFound(false);
    }
    if (history.isPending || historyAccessPending || loadingOlder) return;

    const index = rowIndexOf(rows, searchTargetId);
    if (index >= 0) {
      setFocusedMessageId(searchTargetId);
      setStoryReplyNotFound(false);
      storyReplySearchRef.current = null;
      if (jumpTargetId) setJumpTargetId(null);
      requestAnimationFrame(() => {
        listRef.current?.scrollToIndex({ index, animated: !reduceMotion, viewPosition: 0.5 });
      });
      return;
    }

    if (!hasMoreOlder || !oldestLoadedAt || search.pages >= 20 || search.before === oldestLoadedAt) {
      storyReplySearchRef.current = null;
      if (jumpTargetId) {
        setJumpTargetId(null);
        notify.info('El mensaje original ya no está en el historial.');
      } else {
        setStoryReplyNotFound(true);
      }
      return;
    }
    search.pages += 1;
    search.before = oldestLoadedAt;
    void loadOlderMessages();
  }, [
    hasMoreOlder,
    history.isPending,
    historyAccessPending,
    jumpTargetId,
    loadOlderMessages,
    loadingOlder,
    oldestLoadedAt,
    reduceMotion,
    rows,
    searchTargetId,
  ]);

  // El resalte de un salto dura lo justo para encontrarlo con la vista.
  useEffect(() => {
    if (!focusedMessageId || focusedMessageId === storyReplyMessageId) return;
    const timer = setTimeout(() => setFocusedMessageId(null), 1_600);
    return () => clearTimeout(timer);
  }, [focusedMessageId, storyReplyMessageId]);

  /** En una lista invertida el final del hilo es el desplazamiento cero. */
  const scrollToLatest = useCallback(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: !reduceMotion });
    setUnreadAway(0);
  }, [reduceMotion]);

  /** El botón de bajar aparece al alejarse del último mensaje; volver abajo pone el contador a cero. */
  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const atBottom = event.nativeEvent.contentOffset.y < AT_BOTTOM_OFFSET;
    if (atBottom === atBottomRef.current) return;
    atBottomRef.current = atBottom;
    setAwayFromBottom(!atBottom);
    if (atBottom) setUnreadAway(0);
  }, []);

  /**
   * Un envío propio entra en la vista sin esperar a que el socket lo reemita —
   * si además llega por el socket, `mergeMessages` lo descarta por id.
   */
  const showOwnMessage = useCallback(
    (message: Message) => {
      if (unavailableConversationRef.current === conversationId) return;
      setLiveMessages((current) => mergeIncomingMessage(current, message, deletedMessageIdsRef.current));
      scrollToLatest();
    },
    [conversationId, scrollToLatest],
  );

  // Abrir la conversación (o recibir un mensaje mientras está abierta) es
  // haberla leído — se re-marca por cada mensaje nuevo, no solo al montar.
  // La clave es el último mensaje y no el total, para que cargar páginas
  // anteriores no dispare marcados que no corresponden.
  const latestMessageId = messages.at(-1)?.id;
  useEffect(() => {
    if (!conversationId || !latestMessageId) return;
    const key = `${conversationId}:${latestMessageId}`;
    if (markedReadRef.current === key) return;
    markedReadRef.current = key;
    void chatService.markRead(conversationId).catch(() => {});
  }, [conversationId, latestMessageId]);

  // El snapshot REST es lo primero que se ve; en cuanto llega un evento en
  // vivo por el socket (misma cuenta que abrió/cerró) ese pasa a mandar.
  const matchingLivePresence = livePresence && livePresence.userId === otherUserId ? livePresence : null;
  const otherOnline = matchingLivePresence?.online ?? otherConversation?.otherUserOnline ?? false;
  const otherLastSeenAt = matchingLivePresence?.lastSeenAt ?? otherConversation?.otherUserLastSeenAt ?? null;

  // Igual que la presencia: el resumen REST manda hasta que llega un evento
  // en vivo del socket para esta misma persona, que pasa a ser la fuente.
  const otherLastDeliveredAt =
    (receiptPolicy.cursor?.deliveredAt ?? receiptPolicy.cursor?.readAt) ?? otherConversation?.otherUserLastDeliveredAt ?? null;
  const otherLastReadAt = visibleReceiptReadAt(
    receiptPolicy,
    readReceiptSettings.data?.enabled,
    otherConversation?.otherUserLastReadAt,
  );
  const otherReadReceiptsSince = latestReceiptCutoff(
    receiptPolicy.cutoffAt,
    receiptPolicy.cursor?.readFrom,
    otherConversation?.otherUserReadReceiptsSinceAt,
  );

  /** Pinta unas reacciones en las tres fuentes del hilo (páginas viejas, historial y socket). */
  function patchReactions(update: { messageId: string; reactions: MessageReactionsUpdate['reactions'] }) {
    setLiveMessages((current) => applyReactions(current, update));
    setOlderMessages((current) => applyReactions(current, update));
    queryClient.setQueryData<Message[]>(['chat', 'messages', currentConversationRef.current], (current) =>
      current ? applyReactions(current, update) : current,
    );
  }

  /** Reaccionar (o quitar la reacción) al instante; si el servidor la rechaza, vuelve la de antes. */
  async function react(message: Message, chosen: string) {
    if (!currentUserId || message.type === 'system' || !canWrite) return;
    const targetConversationId = conversationId;
    const before = message.reactions ?? [];
    const emoji = nextReaction(myReaction(before, currentUserId), chosen);
    patchReactions({ messageId: message.id, reactions: withReaction(before, currentUserId, emoji) });
    try {
      const result = await chatService.setReaction(targetConversationId, message.id, emoji);
      if (currentConversationRef.current === targetConversationId) patchReactions(result);
    } catch (error: unknown) {
      if (currentConversationRef.current === targetConversationId) patchReactions({ messageId: message.id, reactions: before });
      notify.error(error instanceof Error ? error.message : 'No se pudo guardar la reacción.');
    }
  }

  /** Deslizar una burbuja o «Responder»: la cita entra en el redactor y se abre el teclado. */
  function beginReply(message: Message) {
    if (!canWrite || message.type === 'system' || isTombstone(message, deletedMessageIds)) return;
    if (editingMessageId) cancelMessageEdit();
    setAttachOpen(false);
    setReplyTarget(message);
    setComposerFocusRequest((count) => count + 1);
  }

  /** «Escribiendo…»: un aviso al empezar y cada pocos segundos mientras se teclea; al parar, se apaga. */
  function handleDraftChange(value: string) {
    setDraft(value);
    if (!conversationId || editingMessageId) return;
    const now = Date.now();
    if (value.trim() && now - typingSentAtRef.current > TYPING_REFRESH_MS) {
      typingSentAtRef.current = now;
      sendTyping(conversationId, true);
    }
    if (typingIdleRef.current) clearTimeout(typingIdleRef.current);
    typingIdleRef.current = setTimeout(() => stopTyping(), value.trim() ? TYPING_IDLE_MS : 0);
  }
  function stopTyping() {
    if (typingIdleRef.current) clearTimeout(typingIdleRef.current);
    typingIdleRef.current = null;
    if (!typingSentAtRef.current || !conversationId) return;
    typingSentAtRef.current = 0;
    sendTyping(conversationId, false);
  }

  const deleteMessage = useMutation({
    mutationFn: ({ message, scope }: { message: Message; scope: 'ME' | 'EVERYONE' }) =>
      chatService.deleteMessage(conversationId, message.id, scope),
    onSuccess: (_result, { message, scope }) => {
      setDeleteTarget(null);
      if (scope === 'ME') {
        setHiddenMessageIds((current) => new Set(current).add(message.id));
      } else {
        const event = { conversationId, messageId: message.id, scope: 'EVERYONE' as const, deletedAt: new Date().toISOString() };
        deletedMessageIdsRef.current.add(message.id);
        setDeletedMessageIds((current) => new Set(current).add(message.id));
        setLiveMessages((current) => applyMessageDeleted(current, event));
        setOlderMessages((current) => applyMessageDeleted(current, event));
      }
      if (editingMessageId === message.id) {
        setEditingMessageId(null);
        setDraft('');
      }
      void queryClient.invalidateQueries({ queryKey: ['chat', 'messages', conversationId] });
      void queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
    },
    onError: (error: Error) => notify.error(error.message),
  });

  /**
   * Lo siguiente a la hoja de acciones (enfocar el campo para editar, abrir la
   * hoja de eliminar, el diálogo de reportar) se hace cuando la hoja ya se fue:
   * en un iPhone real un temporizador fijo no siempre basta y iOS no presenta
   * ni enfoca nada mientras otro Modal se está cerrando. `onDismiss` es de iOS;
   * el temporizador queda de respaldo y lo que se ejecuta, se ejecuta una vez.
   */
  function afterActionsSheet(next: () => void) {
    afterActionsRef.current = next;
    setTimeout(runAfterActionsSheet, Platform.OS === 'ios' ? 700 : 350);
  }
  function runAfterActionsSheet() {
    const next = afterActionsRef.current;
    afterActionsRef.current = null;
    next?.();
  }

  function handleMessageAction(message: Message, action: MessageAction) {
    setActionMessage(null);
    if (action === 'reply') {
      setReplyTarget(message);
      if (editingMessageId) cancelMessageEdit();
      afterActionsSheet(() => setComposerFocusRequest((count) => count + 1));
    } else if (action === 'forward') {
      // Una pantalla de la pila (no otra hoja encima): se abre cuando la hoja ya se fue.
      afterActionsSheet(() => router.push({
        pathname: '/chat/reenviar',
        params: { fromConversationId: conversationId, messageId: message.id },
      }));
    } else if (action === 'copy') {
      void Clipboard.setStringAsync(message.body ?? '').then(() => notify.success('Mensaje copiado.'));
    } else if (action === 'edit') {
      if (beginMessageEdit(message)) afterActionsSheet(() => setComposerFocusRequest((count) => count + 1));
    } else if (action === 'delete') {
      afterActionsSheet(() => setDeleteTarget(message));
    } else {
      afterActionsSheet(() => Alert.alert(
        'Reportar mensaje',
        'Elige el motivo. Al reportarlo, este chat se cerrará para ambos.',
        [
          { text: 'Acoso', onPress: () => reportMessage.mutate({ messageId: message.id, reason: 'ACOSO' }) },
          { text: 'Spam', onPress: () => reportMessage.mutate({ messageId: message.id, reason: 'SPAM' }) },
          { text: 'Otro', onPress: () => reportMessage.mutate({ messageId: message.id, reason: 'OTRO' }) },
          { text: 'Cancelar', style: 'cancel' },
        ],
      ));
    }
  }

  const viewOnceOpen = useMutation({
    mutationFn: (messageId: string) => chatService.viewMessage(conversationId, messageId),
    onSuccess: (revealed) => {
      if (unavailableConversationRef.current === conversationId) return;
      if (deletedMessageIdsRef.current.has(revealed.id)) return;
      if (!revealed.mediaUrl) return;
      setRevealedMedia((current) => ({
        ...current,
        [revealed.id]: { mediaUrl: revealed.mediaUrl as string, mediaMimeType: revealed.mediaMimeType },
      }));
      if (revealed.type === 'image') setViewerUri(revealed.mediaUrl);
      else void Linking.openURL(revealed.mediaUrl);
    },
    onError: (error: Error) => notify.error(error.message),
  });

  /** Mantener pulsado el micrófono: pide permiso la primera vez y empieza a grabar. */
  async function startVoiceNote() {
    if (!canWrite || sending || sendingMedia || voice.recording) return;
    try {
      const result = await voice.start();
      if (result === 'permission-granted') {
        notify.info('Listo. Mantén pulsado el micrófono para grabar.');
      } else if (result === 'permission-blocked') {
        Alert.alert(
          'Permite el micrófono en Ajustes',
          'Para grabar notas de voz, activa el micrófono para REPP en los ajustes del dispositivo.',
          [
            { text: 'Ahora no', style: 'cancel' },
            { text: 'Abrir Ajustes', onPress: () => void Linking.openSettings() },
          ],
        );
      } else if (result === 'permission-denied') {
        notify.error('Sin permiso de micrófono no se pueden grabar notas de voz.');
      }
    } catch (error: unknown) {
      notify.error(error instanceof Error ? error.message : 'No se pudo iniciar la grabación.');
    }
  }

  /**
   * Soltar, enviar, papelera o el límite de 2 minutos: para la grabación (si
   * todavía estaba arrancando, espera a que arranque), espera a que el archivo
   * quede cerrado y lo sube. Una sola vez aunque lleguen dos órdenes juntas.
   */
  async function finishVoiceNote(send: boolean) {
    if (finishingVoiceRef.current) return;
    finishingVoiceRef.current = true;
    if (send) setSendingMedia(true);
    try {
      const result = await voice.stop(send);
      if (result.kind === 'too-short') {
        notify.info('Mantén pulsado el micrófono al menos un segundo para grabar.');
        return;
      }
      if (result.kind !== 'ready') return;
      if (!conversationId || !canWrite || unavailableConversationRef.current === conversationId) return;
      const replyToId = replyTarget?.id;
      const sent = await chatService.sendMediaMessage(conversationId, result.file, {
        type: 'audio',
        viewOnce: false,
        ...(replyToId ? { replyToId } : {}),
      });
      showOwnMessage(sent);
      if (replyToId) setReplyTarget(null);
    } catch (error: unknown) {
      notify.error(error instanceof Error ? error.message : 'No se pudo enviar el mensaje de voz.');
    } finally {
      setSendingMedia(false);
      finishingVoiceRef.current = false;
    }
  }
  voiceLimitRef.current = () => void finishVoiceNote(true);

  function pickedFrom(asset: ImagePicker.ImagePickerAsset, viewOnce = false): PickedMedia {
    const isVideo = asset.type === 'video' || (asset.mimeType ?? '').startsWith('video/');
    const mimeType = asset.mimeType ?? (isVideo ? 'video/mp4' : 'image/jpeg');
    return {
      uri: asset.uri,
      name: asset.fileName ?? (isVideo ? 'video.mp4' : 'photo.jpg'),
      mimeType,
      kind: isVideo ? 'video' : 'image',
      viewOnce,
    };
  }

  async function pickFromGallery(viewOnce = false) {
    if (!canWrite) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      notify.error('Se necesita acceso a la galería para compartir fotos o videos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      quality: 0.85,
      // HEIC no está entre los formatos que acepta el servidor: «compatible»
      // hace que iOS entregue JPEG / MP4.
      preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
      videoMaxDuration: 120,
    });
    const asset = result.canceled ? null : result.assets?.[0];
    if (asset) setPickedMedia(pickedFrom(asset, viewOnce));
  }

  async function pickFromCamera() {
    if (!canWrite) return;
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      notify.error('Se necesita acceso a la cámara para hacer una foto.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images', 'videos'],
      quality: 0.85,
      videoMaxDuration: 120,
    });
    const asset = result.canceled ? null : result.assets?.[0];
    if (asset) setPickedMedia(pickedFrom(asset));
  }

  async function sendPickedMedia({ caption, viewOnce }: { caption: string; viewOnce: boolean }) {
    const media = pickedMedia;
    if (!media || !conversationId || !canWrite || unavailableConversationRef.current === conversationId) return;
    setSendingMedia(true);
    try {
      const sent = await chatService.sendMediaMessage(
        conversationId,
        { uri: media.uri, name: media.name, mimeType: media.mimeType },
        {
          type: media.kind,
          viewOnce,
          ...(caption ? { body: caption } : {}),
          ...(replyTarget ? { replyToId: replyTarget.id } : {}),
        },
      );
      showOwnMessage(sent);
      setPickedMedia(null);
      setReplyTarget(null);
    } catch (error: unknown) {
      notify.error(error instanceof Error ? error.message : 'No se pudo enviar el archivo.');
    } finally {
      setSendingMedia(false);
    }
  }

  /** «Ubicación»: una pantalla con «mi ubicación actual» y el mapa para elegir un lugar. */
  function openPlacePicker() {
    if (!conversationId || !canWrite) return;
    const replyToId = replyTarget?.id;
    router.push({ pathname: '/chat/lugar', params: { conversationId, ...(replyToId ? { replyToId } : {}) } });
    if (replyToId) setReplyTarget(null);
  }

  /** Lo que se eligió en el desplegable del «+». Nada de esto pasa por un Modal intermedio. */
  function handleAttach(kind: AttachKind) {
    setAttachOpen(false);
    if (kind === 'emoji') setEmojiOpen(true);
    else if (kind === 'photo') void pickFromGallery();
    else if (kind === 'viewOnce') void pickFromGallery(true);
    else if (kind === 'camera') void pickFromCamera();
    else openPlacePicker();
  }

  async function handleSend() {
    const body = draft.trim();
    if (!body || !conversationId || !canWrite) return;
    const replyToId = replyTarget?.id;
    setSending(true);
    stopTyping();
    try {
      const ack = await sendMessage(conversationId, body, replyToId);
      if (ack.ok) {
        // El socket devuelve el mensaje por `message:new`; sólo hay que seguirlo.
        scrollToLatest();
      } else {
        // Sin socket el REST es el que guarda el mensaje, y su respuesta es la
        // única copia que va a existir en esta pantalla: descartarla lo borraba.
        showOwnMessage(await chatService.sendMessage(conversationId, body, replyToId));
      }
      setDraft('');
      setReplyTarget(null);
    } catch (error: unknown) {
      notify.error(error instanceof Error ? error.message : 'No se pudo enviar el mensaje.');
    } finally {
      setSending(false);
    }
  }

  function beginMessageEdit(message: Message): boolean {
    if (!currentUserId || !canWrite) return false;
    if (!canEditMessage(message, currentUserId)) {
      notify.info('Solo puedes editar tus mensajes de texto durante 15 minutos.');
      return false;
    }
    setReplyTarget(null);
    setEditingMessageId(message.id);
    setDraft(message.body ?? '');
    return true;
  }

  /** Pinta una versión del mensaje en las tres fuentes del hilo (páginas viejas, historial y socket). */
  function applyLocalMessageVersion(targetConversationId: string, version: Message) {
    updatedMessagesRef.current.set(version.id, version);
    setLiveMessages((current) => applyMessageUpdated(current, version, targetConversationId, deletedMessageIdsRef.current));
    setOlderMessages((current) => applyMessageUpdated(current, version, targetConversationId, deletedMessageIdsRef.current));
    void patchChatMessageCache({
      queryClient,
      conversationId: targetConversationId,
      updated: version,
      isCurrent: () =>
        currentConversationRef.current === targetConversationId &&
        unavailableConversationRef.current !== targetConversationId &&
        !deletedMessageIdsRef.current.has(version.id),
      getDeletedMessageIds: () => deletedMessageIdsRef.current,
    });
  }

  function cancelMessageEdit() {
    setEditingMessageId(null);
    setDraft('');
  }

  async function handleSaveMessageEdit() {
    const body = draft.trim();
    const targetConversationId = conversationId;
    const targetMessageId = editingMessageId;
    if (!body || !targetConversationId || !targetMessageId || !canWrite || !currentUserId) return;
    const original = messages.find((message) => message.id === targetMessageId);
    if (!original || original.type === 'system' || deletedMessageIdsRef.current.has(targetMessageId)) {
      cancelMessageEdit();
      return;
    }
    if (!canEditMessage(original, currentUserId)) {
      // Antes se cancelaba en silencio: el texto escrito desaparecía sin explicación.
      notify.info('Pasaron los 15 minutos: este mensaje ya no se puede editar.');
      cancelMessageEdit();
      return;
    }
    if (body === original.body) {
      cancelMessageEdit();
      return;
    }

    // Como WhatsApp: el texto nuevo se ve al instante y vuelve atrás si el servidor lo rechaza.
    applyLocalMessageVersion(targetConversationId, { ...original, body, editedAt: new Date().toISOString() });
    setEditingMessageId(null);
    setDraft('');
    setSavingEdit(true);
    try {
      const updated = await chatService.editMessage(targetConversationId, targetMessageId, body);
      if (
        currentConversationRef.current !== targetConversationId ||
        unavailableConversationRef.current === targetConversationId ||
        deletedMessageIdsRef.current.has(targetMessageId)
      ) return;
      applyLocalMessageVersion(targetConversationId, updated);
      void queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
    } catch (error: unknown) {
      if (currentConversationRef.current === targetConversationId) {
        applyLocalMessageVersion(targetConversationId, original);
        setEditingMessageId(targetMessageId);
        setDraft(body);
      }
      notify.error(error instanceof Error ? error.message : 'No se pudo editar el mensaje.');
    } finally {
      setSavingEdit(false);
    }
  }

  function receiptFor(message: Message): Receipt {
    if (isMessageReadByOther(message.createdAt, otherLastReadAt, otherReadReceiptsSince)) return 'read';
    return otherLastDeliveredAt && message.createdAt <= otherLastDeliveredAt ? 'delivered' : 'sent';
  }

  function renderRow({ item: row }: ListRenderItemInfo<ChatRow>) {
    if (row.kind === 'day') return <DaySeparator label={row.label} />;
    const item = row.message;
    if (item.type === 'system') {
      return (
        <SystemNotice
          line={chatSystemEventMessage(item.systemEvent, currentUserId, displayName)}
          timer={item.systemEvent.kind === 'DISAPPEARING_MESSAGES_CHANGED'}
        />
      );
    }
    const mine = item.senderId === currentUserId;
    const baseline = newestAtOpen.current;
    const tombstone = isTombstone(item, deletedMessageIds);
    const openActions = () => {
      if (!currentUserId) return;
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setAttachOpen(false);
      setActionMessage(item);
    };
    const visualMedia = item.type === 'image' || item.type === 'video';
    const body = tombstone
      ? null
      : item.type === 'text'
        ? item.body
        : visualMedia && !item.viewOnce && (revealedMedia[item.id]?.mediaUrl ?? item.mediaUrl)
          ? item.body
          : null;
    return (
      <MessageBubble
        animateIn={baseline !== null && item.createdAt > baseline}
        body={body}
        canReply={canWrite}
        currentUserId={currentUserId}
        groupedWithNewer={row.groupedWithNewer}
        groupedWithOlder={row.groupedWithOlder}
        highlighted={item.id === focusedMessageId}
        media={item.type === 'text' && !tombstone ? null : (
          <MessageMedia
            message={item}
            mine={mine}
            onLongPress={openActions}
            onMediaError={onMediaError}
            onOpenImage={setViewerUri}
            onOpenViewOnce={() => viewOnceOpen.mutate(item.id)}
            openingViewOnce={viewOnceOpen.isPending}
            revealed={revealedMedia[item.id]}
            token={mediaAccessToken}
            tombstone={tombstone}
          />
        )}
        message={item}
        mine={mine}
        onLongPress={openActions}
        onPressQuote={setJumpTargetId}
        onPressReactions={openActions}
        onReply={() => beginReply(item)}
        quoteAuthor={item.replyTo ? replyAuthorLabel(item.replyTo.senderId, currentUserId, displayName) : null}
        receipt={mine ? receiptFor(item) : null}
        reduceMotion={reduceMotion}
        storyLabel={item.storyReference ? storyReferenceLabel(item.storyReference.available) : null}
        tombstone={tombstone}
      />
    );
  }

  const visibleViewerUri = viewerUriWhileHistoryAccessPending(viewerUri, historyAccessPending);

  if (history.isPending) {
    return (
      <ScrollScreen>
        <BackLink />
        <Skeleton height={300} />
      </ScrollScreen>
    );
  }
  if (history.isError && !isChatHistoryNotFound(history.error)) {
    return (
      <ScrollScreen>
        <BackLink />
        <ErrorState error={history.error} onRetry={() => void history.refetch()} />
      </ScrollScreen>
    );
  }

  // Un hilo de chat necesita una lista virtualizada e invertida, no el
  // `ScrollView` compartido: los márgenes se arman aquí. En el teléfono la
  // burbuja va casi al borde, como en WhatsApp; en pantallas anchas se centra.
  const gutter = Math.max(spacing.xs, (width - (wide ? maxWideContentWidth : maxContentWidth)) / 2);
  const topInset = Math.max(insets.top, StatusBar.currentHeight ?? 0);
  const canTrainTogether = otherConversation?.systemKind === null && canWrite && Boolean(otherUserId);

  return (
    <>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ChatWallpaper />
        <View style={{ paddingTop: topInset, paddingLeft: insets.left, paddingRight: insets.right, backgroundColor: colors.surfaceLow }}>
          <ChatHeader
            disappearingSeconds={disappearingSeconds}
            displayName={displayName}
            name={otherName}
            onBack={() => (router.canGoBack() ? router.back() : router.replace('/comunidad'))}
            onOpenContact={() => setContactOpen(true)}
            onTrainTogether={canTrainTogether ? () => setInviteModalOpen(true) : null}
            online={otherOnline}
            photoUrl={otherPhotoUrl}
            presence={presenceLabel(otherOnline, otherLastSeenAt)}
            typing={otherTyping}
          />
        </View>
        {otherConversation?.systemKind === null && otherUserId ? (
          <CreateTrainingInviteModal
            onClose={() => setInviteModalOpen(false)}
            recipientId={otherUserId}
            recipientName={otherName ?? 'tu conexión'}
            visible={inviteModalOpen && canWrite}
          />
        ) : null}
        <KeyboardAvoidingView
          // Android reduce la ventana con el teclado abierto; iOS no, y sin esto
          // el redactor queda detrás del teclado justo mientras se escribe.
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{
            flex: 1,
            paddingBottom: insets.bottom + spacing.sm,
            paddingLeft: gutter + insets.left,
            paddingRight: gutter + insets.right,
          }}
        >
          {storyReplyNotFound ? (
            <Text accessibilityLiveRegion="polite" style={{ color: colors.textMuted, fontSize: fontSizes.xs, textAlign: 'center', paddingVertical: spacing.xs }}>
              No se encontró la respuesta a la story en el historial consultado.
            </Text>
          ) : null}
          <View style={{ flex: 1 }}>
            <FlatList
              // Invertida: el hilo se lee desde el final, que es donde queda el
              // desplazamiento cero — un mensaje nuevo aparece sin tener que
              // perseguirlo con `scrollToEnd`, y traer páginas viejas (que entran
              // por el otro extremo) no mueve lo que se está mirando.
              contentContainerStyle={{ paddingVertical: spacing.sm }}
              data={rows}
              initialNumToRender={14}
              inverted
              keyboardDismissMode="interactive"
              keyboardShouldPersistTaps="handled"
              keyExtractor={(row) => row.key}
              maxToRenderPerBatch={10}
              onScroll={handleScroll}
              onScrollBeginDrag={() => setAttachOpen(false)}
              removeClippedSubviews={Platform.OS === 'android'}
              scrollEventThrottle={64}
              updateCellsBatchingPeriod={50}
              windowSize={9}
              ListEmptyComponent={
                <EmptyState
                  icon="chatbubble-ellipses-outline"
                  message={conversationRevoked || isChatHistoryNotFound(history.error) ? 'El historial y los archivos de esta conversación ya no están disponibles.' : 'Escribe el primero y empieza la conversación.'}
                  title={conversationRevoked || isChatHistoryNotFound(history.error) ? 'Chat cerrado' : 'Todavía no hay mensajes'}
                />
              }
              // En una lista invertida el pie es el borde superior: ahí es donde
              // se ve que se están trayendo los mensajes anteriores.
              ListFooterComponent={
                loadingOlder ? (
                  <ActivityIndicator color={colors.textMuted} style={{ marginVertical: spacing.md }} />
                ) : null
              }
              // El "final" de los datos es el mensaje más viejo — o sea, el tope.
              onEndReached={() => void loadOlderMessages()}
              onEndReachedThreshold={0.4}
              onScrollToIndexFailed={({ averageItemLength, index }) => {
                listRef.current?.scrollToOffset({ offset: averageItemLength * index, animated: true });
                setTimeout(() => listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 }), 250);
              }}
              ref={listRef}
              renderItem={renderRow}
              showsVerticalScrollIndicator={false}
              style={{ flex: 1 }}
            />
            <ScrollToLatestButton onPress={scrollToLatest} reduceMotion={reduceMotion} unread={unreadAway} visible={awayFromBottom} />
          </View>

          {canWrite ? (
            <View style={{ paddingTop: spacing.xs, paddingHorizontal: spacing.xs }}>
              <ChatComposer
                attachOpen={attachOpen}
                busy={sendingMedia}
                draft={draft}
                editing={editingMessageId ? { body: messages.find((message) => message.id === editingMessageId)?.body ?? '' } : null}
                focusRequest={composerFocusRequest}
                onAttach={handleAttach}
                onCancelEdit={cancelMessageEdit}
                onCancelReply={() => setReplyTarget(null)}
                onChangeDraft={handleDraftChange}
                onSend={() => void (editingMessageId ? handleSaveMessageEdit() : handleSend())}
                onToggleAttach={() => setAttachOpen((open) => !open)}
                onVoiceStart={() => void startVoiceNote()}
                onVoiceStop={(send) => void finishVoiceNote(send)}
                recording={voice.recording}
                recordingMillis={voice.elapsedMs}
                replying={replyTarget && replyTarget.type !== 'system' ? {
                  author: replyAuthorLabel(replyTarget.senderId, currentUserId, displayName),
                  preview: messagePreviewText(replyTarget),
                  ownQuote: replyTarget.senderId === currentUserId,
                } : null}
                sending={sending || savingEdit}
              />
            </View>
          ) : (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: spacing.xs,
                marginTop: spacing.sm,
                marginHorizontal: spacing.sm,
                borderRadius: radii.lg,
                backgroundColor: colors.surfaceHigh,
                padding: spacing.sm,
              }}
            >
              <Ionicons color={colors.textMuted} name="lock-closed-outline" size={fontSizes.sm} />
              <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>
                Solo lectura — no puedes escribir en esta conversación.
              </Text>
            </View>
          )}
        </KeyboardAvoidingView>
      </View>
      <Modal
        animationType="fade"
        onRequestClose={() => setViewerUri(null)}
        transparent
        visible={Boolean(visibleViewerUri)}
      >
        <Pressable
          accessibilityLabel="Cerrar"
          accessibilityRole="button"
          onPress={() => setViewerUri(null)}
          style={{ flex: 1, backgroundColor: overlay.scrimSolid, alignItems: 'center', justifyContent: 'center' }}
        >
          {visibleViewerUri ? (
            <Image
              cachePolicy="memory-disk"
              contentFit="contain"
              onError={onMediaError}
              priority="high"
              recyclingKey={visibleViewerUri}
              source={{
                uri: resolveChatMediaUrl(visibleViewerUri),
                ...(mediaAccessToken ? { headers: { Authorization: `Bearer ${mediaAccessToken}` } } : {}),
              }}
              style={{ width: '100%', height: '80%' }}
            />
          ) : null}
        </Pressable>
      </Modal>
      <EmojiPicker
        onClose={() => {
          setEmojiOpen(false);
          setEmojiReactionTarget(null);
        }}
        onEmojiSelected={(selection) => {
          if (emojiReactionTarget) void react(emojiReactionTarget, selection.emoji);
          else setDraft((current) => current + selection.emoji);
        }}
        open={emojiOpen}
      />
      <MediaPreview
        media={pickedMedia}
        onCancel={() => setPickedMedia(null)}
        onSend={(options) => void sendPickedMedia(options)}
        sending={sendingMedia}
      />
      <MessageActionsSheet
        actions={actionMessage && currentUserId
          ? messageActions(actionMessage, currentUserId, {
            canWrite,
            tombstone: isTombstone(actionMessage, deletedMessageIds),
          })
          : []}
        onAction={(action) => actionMessage && handleMessageAction(actionMessage, action)}
        onClose={() => setActionMessage(null)}
        onDismiss={runAfterActionsSheet}
        onMoreReactions={() => {
          const target = actionMessage;
          setActionMessage(null);
          // El teclado de emojis es otro Modal: se abre cuando la hoja ya se fue.
          if (target) afterActionsSheet(() => {
            setEmojiReactionTarget(target);
            setEmojiOpen(true);
          });
        }}
        onReact={(emoji) => {
          const target = actionMessage;
          setActionMessage(null);
          if (target) void react(target, emoji);
        }}
        preview={actionMessage
          ? isTombstone(actionMessage, deletedMessageIds)
            ? tombstoneLabel(actionMessage.senderId === currentUserId)
            : messagePreviewText(actionMessage)
          : ''}
        reaction={actionMessage && actionMessage.type !== 'system' && canWrite && !isTombstone(actionMessage, deletedMessageIds)
          ? myReaction(actionMessage.reactions, currentUserId)
          : undefined}
        visible={Boolean(actionMessage)}
      />
      <DeleteMessageSheet
        canDeleteForEveryone={Boolean(
          deleteTarget && currentUserId &&
          !isTombstone(deleteTarget, deletedMessageIds) &&
          canDeleteForEveryone(deleteTarget, currentUserId),
        )}
        onClose={() => setDeleteTarget(null)}
        onDelete={(scope) => deleteTarget && deleteMessage.mutate({ message: deleteTarget, scope })}
        pending={deleteMessage.isPending}
        visible={Boolean(deleteTarget)}
      />
      <ContactInfoSheet
        name={otherName ?? 'Conversación'}
        nickname={otherConversation?.nickname ?? null}
        onClose={() => setContactOpen(false)}
        onOpenProfile={otherUserId ? () => {
          setContactOpen(false);
          router.push({ pathname: '/perfil/[userId]', params: { userId: otherUserId } });
        } : null}
        onSaveNickname={(nickname) => setNickname.mutate(nickname, {
          onSuccess: () => notify.success(nickname ? 'Apodo guardado.' : 'Apodo eliminado.'),
        })}
        onToggleReceipts={(enabled) => {
          const settings = readReceiptSettings.data;
          if (!settings) return;
          updateReadReceiptSettings.mutate({
            scope: 'CONVERSATION',
            conversationId,
            enabled,
            expectedVersion: settings.version,
          });
        }}
        onTrainTogether={otherConversation?.systemKind === null && canWrite && otherUserId ? () => {
          setContactOpen(false);
          setTimeout(() => setInviteModalOpen(true), 350);
        } : null}
        online={otherOnline}
        photoUrl={otherPhotoUrl}
        presence={presenceLabel(otherOnline, otherLastSeenAt)}
        receiptsEnabled={readReceiptSettings.data?.enabled}
        receiptsPending={updateReadReceiptSettings.isPending}
        disappearingPending={setDisappearing.isPending}
        disappearingSeconds={disappearingSeconds}
        onChangeDisappearing={canWrite && otherConversation?.systemKind === null
          ? (seconds) => setDisappearing.mutate(seconds)
          : null}
        savingNickname={setNickname.isPending}
        visible={contactOpen}
      />
    </>
  );
}
