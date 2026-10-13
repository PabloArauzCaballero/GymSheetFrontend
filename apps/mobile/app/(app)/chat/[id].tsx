import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
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
  TextInput,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import {
  getRecordingPermissionsAsync,
  requestRecordingPermissionsAsync,
  RecordingPresets,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import EmojiPicker from 'rn-emoji-keyboard';
import type { Message } from '@gymsheet/schemas';
import { isMessageReadByOther, trainingInviteAcceptedMessage } from '@gymsheet/domain';
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
import { chatService } from '@/api/services';
import { env } from '@/config/env';
import { secureStoreTokenProvider } from '@/storage/secure-store';
import { useChatSocket, type PresenceUpdate } from '@/hooks/use-chat-socket';
import { BackLink } from '@/components/nav';
import { AmbientBackground } from '@/components/ambient';
import { ScrollScreen, useResponsive } from '@/components/layout';
import { Button } from '@/components/ui';
import { CreateTrainingInviteModal } from '@/features/training-invitations/create-training-invite-modal';
import { DURATION, PREMIUM_EASING, PressableScale } from '@/components/motion';
import { useReduceMotion } from '@/notifications/use-reduce-motion';
import { EmptyState, ErrorState, Skeleton } from '@/components/feedback';
import { notify } from '@/notifications';
import { useAuthStore } from '@/state/auth-store';
import { formatTimeOfDay, initialsOf, presenceLabel } from '@/lib/format';
import { storyReferenceLabel } from '@/lib/story-reference-presentation';
import {
  chatAudioFileForUpload,
  chatAudioPlayerAccessibilityLabel,
  chatAudioPlayerSource,
  chatAudioRecordingDurationLabel,
  isChatAudioDurationValid,
  isMicrophonePermissionPermanentlyDenied,
} from '@/lib/chat-audio';
import {
  colors,
  fontSizes,
  iconSizes,
  maxContentWidth,
  maxWideContentWidth,
  minTouchTarget,
  radii,
  semibold,
  spacing,
} from '@/theme';

/** Fijo — WhatsApp volvió "check azul" un color universal, ajeno a cualquier marca de gimnasio. */
const READ_TICK_COLOR = '#34b7f1';

/**
 * Mensajes por página. El backend admite hasta 100 y devuelve los más
 * recientes; una página que llena de sobra una pantalla evita que abrir el
 * chat cueste el hilo entero, y `before` trae el resto al subir.
 */
const PAGE_SIZE = 40;

/** Separación entre burbujas; se acorta un poco cuando siguen al mismo emisor. */
const BUBBLE_GAP = spacing.sm;
const GROUPED_BUBBLE_GAP = spacing.sm - 4;

type RevealedMedia = { mediaUrl: string; mediaMimeType: string | null };

function resolveChatMediaUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${env.apiUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

function ChatVideo({ uri, token }: { uri: string; token: string | null }) {
  const player = useVideoPlayer(token ? {
    uri: resolveChatMediaUrl(uri),
    headers: { Authorization: `Bearer ${token}` },
    useCaching: false,
  } : null, (videoPlayer) => videoPlayer.pause());

  if (!token) return null;
  return <VideoView nativeControls player={player} style={{ width: 240, height: 220, borderRadius: radii.md }} />;
}

function ChatAudioMessage({ uri, token }: { uri: string; token: string | null }) {
  const source = token ? chatAudioPlayerSource(uri, env.apiUrl, token) : null;
  const player = useAudioPlayer(source, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);
  const unavailable = Boolean(status.error);
  const time = status.currentTime > 0 ? status.currentTime : status.duration;

  if (!token) return <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>Audio no disponible.</Text>;
  if (unavailable) return <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>Este audio ya no está disponible.</Text>;

  return (
    <View style={{ minWidth: 174, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      <PressableScale
        accessibilityLabel={status.playing ? 'Pausar audio' : 'Reproducir audio'}
        disabled={!status.isLoaded}
        haptic="none"
        onPress={() => status.playing ? player.pause() : player.play()}
        scaleTo={0.9}
        style={{ width: minTouchTarget, height: minTouchTarget, alignItems: 'center', justifyContent: 'center' }}
      >
        <Ionicons color={colors.volt} name={status.playing ? 'pause' : 'play'} size={iconSizes.md} />
      </PressableScale>
      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ height: 3, overflow: 'hidden', borderRadius: radii.full, backgroundColor: colors.surfaceHigh }}>
          <View style={{ width: `${status.duration > 0 ? Math.min(100, (status.currentTime / status.duration) * 100) : 0}%`, height: 3, backgroundColor: colors.volt }} />
        </View>
        <Text
          accessibilityLabel={chatAudioPlayerAccessibilityLabel(status.isLoaded, status.currentTime, status.duration)}
          style={{ color: colors.textMuted, fontSize: fontSizes.xs }}
        >
          {status.isLoaded ? `${Math.floor(time / 60)}:${String(Math.floor(time % 60)).padStart(2, '0')}` : 'Audio'}
        </Text>
      </View>
    </View>
  );
}

function mapsUrlFor(lat: number, lng: number): string {
  return `https://maps.google.com/?q=${lat},${lng}`;
}

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
  const listRef = useRef<FlatList<Message>>(null);
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
  const [editingNickname, setEditingNickname] = useState(false);
  const [nicknameDraft, setNicknameDraft] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [viewOnceNext, setViewOnceNext] = useState(false);
  const [sendingMedia, setSendingMedia] = useState(false);
  const [focusedStoryReplyMessageId, setFocusedStoryReplyMessageId] = useState<string | null>(null);
  const [storyReplyNotFound, setStoryReplyNotFound] = useState(false);
  const storyReplySearchRef = useRef<{ id: string; pages: number; before: string | null } | null>(null);
  const [recordingAudio, setRecordingAudio] = useState(false);
  const recordingWasActiveRef = useRef(false);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const audioRecorderState = useAudioRecorderState(audioRecorder, 250);
  const [viewerUri, setViewerUri] = useState<string | null>(null);
  const [mediaAccessToken, setMediaAccessToken] = useState<string | null>(null);
  // Vista única: la URL real solo llega una vez del backend — se guarda acá
  // para poder volver a mostrarla dentro de esta misma sesión de pantalla.
  const [revealedMedia, setRevealedMedia] = useState<Record<string, RevealedMedia>>({});
  const [readReceiptMenuOpen, setReadReceiptMenuOpen] = useState(false);
  const [readReceiptSelectionOpen, setReadReceiptSelectionOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [selectedReceiptConversationIds, setSelectedReceiptConversationIds] = useState<string[]>([]);

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

  useEffect(() => {
    let mounted = true;
    void secureStoreTokenProvider.getAccessToken().then((token) => {
      if (mounted) setMediaAccessToken(token);
    });
    return () => { mounted = false; };
  }, [conversationId]);
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

  const setNickname = useMutation({
    mutationFn: (nickname: string | null) => chatService.setNickname(conversationId, nickname),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
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
      setReadReceiptMenuOpen(false);
      setReadReceiptSelectionOpen(false);
      notify.success('Preferencia de lectura actualizada.');
    },
    onError: async (error: Error) => {
      await queryClient.invalidateQueries({ queryKey: ['chat', 'read-receipts'] });
      notify.error(error.message);
    },
  });

  const { connectionState, joinConversation, leaveConversation, sendMessage } = useChatSocket(
    (incoming) => {
      if (incoming.conversationId !== conversationId || unavailableConversationRef.current === conversationId) return;
      setLiveMessages((current) => mergeIncomingMessage(current, incoming, deletedMessageIdsRef.current));
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
  const timeline = useMemo(() => [...messages].reverse(), [messages]);
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

  useEffect(() => {
    if (!storyReplyMessageId) {
      storyReplySearchRef.current = null;
      setStoryReplyNotFound(false);
      setFocusedStoryReplyMessageId(null);
      return;
    }
    let search = storyReplySearchRef.current;
    if (!search || search.id !== storyReplyMessageId) {
      search = { id: storyReplyMessageId, pages: 0, before: null };
      storyReplySearchRef.current = search;
      setStoryReplyNotFound(false);
      setFocusedStoryReplyMessageId(null);
    }
    if (history.isPending || historyAccessPending || loadingOlder) return;

    const index = timeline.findIndex((message) => message.id === storyReplyMessageId);
    if (index >= 0) {
      setFocusedStoryReplyMessageId(storyReplyMessageId);
      setStoryReplyNotFound(false);
      storyReplySearchRef.current = null;
      requestAnimationFrame(() => {
        listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
      });
      return;
    }

    if (!hasMoreOlder || !oldestLoadedAt || search.pages >= 20 || search.before === oldestLoadedAt) {
      setStoryReplyNotFound(true);
      return;
    }
    search.pages += 1;
    search.before = oldestLoadedAt;
    void loadOlderMessages();
  }, [
    hasMoreOlder,
    history.isPending,
    historyAccessPending,
    loadOlderMessages,
    loadingOlder,
    oldestLoadedAt,
    storyReplyMessageId,
    timeline,
  ]);

  /** En una lista invertida el final del hilo es el desplazamiento cero. */
  const scrollToLatest = useCallback(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
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

  function startEditingNickname() {
    setNicknameDraft(otherConversation?.nickname ?? '');
    setEditingNickname(true);
  }

  function saveNickname() {
    const trimmed = nicknameDraft.trim();
    setNickname.mutate(trimmed.length ? trimmed : null);
    setEditingNickname(false);
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

  const finishAudioRecording = useCallback(async () => {
    setRecordingAudio(false);
    try {
      const recorderStatus = await audioRecorder.getStatus();
      const durationMs = Math.max(audioRecorder.currentTime * 1_000, recorderStatus.durationMillis);
      if (audioRecorder.isRecording) await audioRecorder.stop();
      const uri = audioRecorder.uri;
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      if (!isChatAudioDurationValid(durationMs)) {
        notify.error('El mensaje de voz debe durar al menos 1 segundo y no más de 120 segundos.');
        return;
      }
      if (!uri) {
        notify.error('No se pudo guardar la grabación. Inténtalo de nuevo.');
        return;
      }
      if (!conversationId || !canWrite || unavailableConversationRef.current === conversationId) return;

      setSendingMedia(true);
      const sent = await chatService.sendMediaMessage(
        conversationId,
        chatAudioFileForUpload(uri),
        { type: 'audio', viewOnce: false },
      );
      showOwnMessage(sent);
    } catch (error: unknown) {
      notify.error(error instanceof Error ? error.message : 'No se pudo enviar el mensaje de voz.');
    } finally {
      setSendingMedia(false);
      recordingWasActiveRef.current = false;
      try {
        await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      } catch {
        // Audio mode cleanup should not block text chat if the device audio session resets.
      }
    }
  }, [audioRecorder, canWrite, conversationId, showOwnMessage]);

  useEffect(() => {
    if (audioRecorderState.isRecording) {
      recordingWasActiveRef.current = true;
      return;
    }
    if (!recordingAudio || !recordingWasActiveRef.current) return;
    recordingWasActiveRef.current = false;
    void finishAudioRecording();
  }, [audioRecorderState.isRecording, finishAudioRecording, recordingAudio]);

  async function handleRecordAudio() {
    if (!canWrite || sending || sendingMedia) return;
    if (recordingAudio) {
      await finishAudioRecording();
      return;
    }

    try {
      const existing = await getRecordingPermissionsAsync();
      const permission = existing.granted
        ? existing
        : existing.canAskAgain
          ? await requestRecordingPermissionsAsync()
          : existing;
      if (!permission.granted) {
        if (isMicrophonePermissionPermanentlyDenied(permission)) {
          Alert.alert(
            'Permite el micrófono en Ajustes',
            'Para grabar mensajes de voz, activa el micrófono para GymSheet en los ajustes del dispositivo. Puedes seguir escribiendo mensajes mientras tanto.',
            [
              { text: 'Ahora no', style: 'cancel' },
              { text: 'Abrir Ajustes', onPress: () => void Linking.openSettings() },
            ],
          );
        } else {
          notify.error('No se otorgó permiso para el micrófono. Puedes seguir escribiendo mensajes.');
        }
        return;
      }

      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record({ forDuration: 119 });
      setRecordingAudio(true);
    } catch (error: unknown) {
      setRecordingAudio(false);
      recordingWasActiveRef.current = false;
      try {
        await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      } catch {
        // Keep the text composer available even if audio session cleanup fails.
      }
      notify.error(error instanceof Error ? error.message : 'No se pudo iniciar la grabación. Puedes escribir un mensaje.');
    }
  }

  async function handleAttach() {
    if (!canWrite) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      notify.error('Se necesita acceso a la galería para compartir fotos o video.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      quality: 0.85,
    });
    const asset = result.canceled ? null : result.assets?.[0];
    if (!asset || !conversationId || !canWrite || unavailableConversationRef.current === conversationId) return;

    const isVideo = asset.type === 'video' || (asset.mimeType ?? '').startsWith('video/');
    const mimeType = asset.mimeType ?? (isVideo ? 'video/mp4' : 'image/jpeg');
    const name = asset.fileName ?? (isVideo ? 'video.mp4' : 'photo.jpg');

    setSendingMedia(true);
    try {
      const sent = await chatService.sendMediaMessage(
        conversationId,
        { uri: asset.uri, name, mimeType },
        { type: isVideo ? 'video' : 'image', viewOnce: viewOnceNext },
      );
      showOwnMessage(sent);
      setViewOnceNext(false);
    } catch (error: unknown) {
      notify.error(error instanceof Error ? error.message : 'No se pudo enviar el archivo.');
    } finally {
      setSendingMedia(false);
    }
  }

  async function handleShareLocation() {
    if (!conversationId || !canWrite) return;
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) {
      notify.error('Se necesita acceso a tu ubicación para compartirla.');
      return;
    }
    setSendingMedia(true);
    try {
      const position = await Location.getCurrentPositionAsync({});
      if (!canWrite || unavailableConversationRef.current === conversationId) return;
      const sent = await chatService.sendLocationMessage(conversationId, {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
      showOwnMessage(sent);
    } catch {
      notify.error('No se pudo obtener tu ubicación.');
    } finally {
      setSendingMedia(false);
    }
  }

  async function handleSend() {
    const body = draft.trim();
    if (!body || !conversationId || !canWrite) return;
    setSending(true);
    try {
      const ack = await sendMessage(conversationId, body);
      if (ack.ok) {
        // El socket devuelve el mensaje por `message:new`; sólo hay que seguirlo.
        scrollToLatest();
      } else {
        // Sin socket el REST es el que guarda el mensaje, y su respuesta es la
        // única copia que va a existir en esta pantalla: descartarla lo borraba.
        showOwnMessage(await chatService.sendMessage(conversationId, body));
      }
      setDraft('');
    } catch (error: unknown) {
      notify.error(error instanceof Error ? error.message : 'No se pudo enviar el mensaje.');
    } finally {
      setSending(false);
    }
  }

  function beginMessageEdit(message: Message) {
    if (!currentUserId || !canWrite || !canEditMessage(message, currentUserId)) return;
    setEditingMessageId(message.id);
    setDraft(message.body ?? '');
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
    if (!original || !canEditMessage(original, currentUserId) || deletedMessageIdsRef.current.has(targetMessageId)) {
      cancelMessageEdit();
      return;
    }

    setSavingEdit(true);
    try {
      const updated = await chatService.editMessage(targetConversationId, targetMessageId, body);
      if (
        currentConversationRef.current !== targetConversationId ||
        unavailableConversationRef.current === targetConversationId ||
        deletedMessageIdsRef.current.has(targetMessageId)
      ) return;
      updatedMessagesRef.current.set(updated.id, updated);
      setLiveMessages((current) => applyMessageUpdated(current, updated, targetConversationId, deletedMessageIdsRef.current));
      setOlderMessages((current) => applyMessageUpdated(current, updated, targetConversationId, deletedMessageIdsRef.current));
      void patchChatMessageCache({
        queryClient,
        conversationId: targetConversationId,
        updated,
        isCurrent: () =>
          currentConversationRef.current === targetConversationId &&
          unavailableConversationRef.current !== targetConversationId &&
          !deletedMessageIdsRef.current.has(targetMessageId),
        getDeletedMessageIds: () => deletedMessageIdsRef.current,
      });
      setEditingMessageId(null);
      setDraft('');
      void queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
    } catch (error: unknown) {
      notify.error(error instanceof Error ? error.message : 'No se pudo editar el mensaje.');
    } finally {
      setSavingEdit(false);
    }
  }

  /** Contenido de la burbuja según el tipo de mensaje — el marco (fondo, radios) es igual para todos. */
  function renderMessageContent(message: Message, mine: boolean) {
    const textColor = mine ? colors.background : colors.text;
    const mutedOnBubble = mine ? 'rgba(11,15,13,0.65)' : colors.textMuted;

    if (message.type === 'audio') {
      return message.mediaUrl
        ? <ChatAudioMessage token={mediaAccessToken} uri={message.mediaUrl} />
        : <Text style={{ color: mutedOnBubble, fontSize: fontSizes.sm }}>Este audio ya no está disponible.</Text>;
    }

    if (message.type === 'location' && message.locationLat !== null && message.locationLng !== null) {
      return (
        <PressableScale
          haptic="none"
          onPress={() => void Linking.openURL(mapsUrlFor(message.locationLat as number, message.locationLng as number))}
          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}
        >
          <Ionicons color={textColor} name="location" size={iconSizes.md} />
          <View>
            <Text style={{ color: textColor, fontSize: fontSizes.sm, fontWeight: semibold }}>Ubicación compartida</Text>
            <Text style={{ color: mutedOnBubble, fontSize: fontSizes.xs }}>Toca para abrir en el mapa</Text>
          </View>
        </PressableScale>
      );
    }

    if (message.type === 'image' || message.type === 'video') {
      const revealed = revealedMedia[message.id];
      const url = revealed?.mediaUrl ?? message.mediaUrl;
      const alreadyViewed = message.viewOnce && message.viewed && !revealed;

      if (alreadyViewed) {
        return (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <Ionicons color={mutedOnBubble} name="eye-off-outline" size={iconSizes.md} />
            <Text style={{ color: mutedOnBubble, fontSize: fontSizes.sm }}>
              {message.type === 'image' ? 'Foto vista' : 'Video visto'}
            </Text>
          </View>
        );
      }

      if (message.viewOnce && !url) {
        // El emisor no puede abrir su propio envío de vista única (el backend lo
        // rechaza) — mostrarlo como estático evita ofrecer un botón que solo falla.
        if (mine) {
          return (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <Ionicons color={mutedOnBubble} name="eye-outline" size={iconSizes.md} />
              <Text style={{ color: mutedOnBubble, fontSize: fontSizes.sm }}>
                {message.type === 'image' ? 'Foto enviada — vista única' : 'Video enviado — vista única'}
              </Text>
            </View>
          );
        }
        return (
          <PressableScale
            disabled={viewOnceOpen.isPending}
            haptic="none"
            onPress={() => viewOnceOpen.mutate(message.id)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}
          >
            <Ionicons color={textColor} name="eye-outline" size={iconSizes.md} />
            <Text style={{ color: textColor, fontSize: fontSizes.sm, fontWeight: semibold }}>
              Toca para ver una vez
            </Text>
          </PressableScale>
        );
      }

      if (!url) {
        // Sin vista única y sin URL: no debería pasar, pero no hay nada que dibujar.
        return <Text style={{ color: mutedOnBubble, fontSize: fontSizes.sm }}>Contenido no disponible.</Text>;
      }

      if (message.type === 'video') {
        return <ChatVideo token={mediaAccessToken} uri={url} />;
      }

      return (
        <PressableScale accessibilityLabel="Abrir foto" haptic="none" onPress={() => setViewerUri(url)} scaleTo={0.98}>
          <Image
            cachePolicy="none"
            contentFit="cover"
            source={{
              uri: resolveChatMediaUrl(url),
              ...(mediaAccessToken ? { headers: { Authorization: `Bearer ${mediaAccessToken}` } } : {}),
            }}
            style={{ width: 220, height: 220, borderRadius: radii.md, backgroundColor: colors.surfaceHigh }}
          />
          {message.body ? (
            <Text style={{ color: textColor, fontSize: fontSizes.sm, marginTop: spacing.xs }}>{message.body}</Text>
          ) : null}
        </PressableScale>
      );
    }

    return (
      <Text style={{ color: textColor, fontSize: fontSizes.sm, lineHeight: fontSizes.sm * 1.35 }}>
        {message.body}
      </Text>
    );
  }

  function renderMessage({ item, index }: ListRenderItemInfo<Message>) {
    if (item.type === 'system') {
      const line = trainingInviteAcceptedMessage(item.systemEvent);
      return (
        <Animated.View
          style={{
            alignSelf: 'stretch',
            alignItems: 'center',
            marginVertical: spacing.sm,
            paddingHorizontal: spacing.md,
          }}
        >
          <Text
            accessibilityLabel={line}
            accessibilityLiveRegion="polite"
            accessibilityRole="text"
            style={{ color: colors.textMuted, fontSize: fontSizes.xs, lineHeight: fontSizes.xs * 1.5, textAlign: 'center' }}
          >
            {line}
          </Text>
        </Animated.View>
      );
    }
    const mine = item.senderId === currentUserId;
    const mutedOnBubble = mine ? 'rgba(11,15,13,0.65)' : colors.textMuted;
    // Los datos van del más nuevo al más viejo: el anterior en el tiempo es el
    // siguiente del arreglo, y en pantalla queda justo encima de este.
    const previous = timeline[index + 1];
    const groupedWithPrevious = previous?.senderId === item.senderId;
    const baseline = newestAtOpen.current;
    const arrivedLater = baseline !== null && item.createdAt > baseline;
    return (
      <Animated.View
        entering={
          arrivedLater
            ? reduceMotion
              ? FadeIn.duration(1)
              : FadeInDown.duration(DURATION.quick + 60)
                  .easing(PREMIUM_EASING)
                  .withInitialValues({ transform: [{ translateY: 10 }] })
            : undefined
        }
        style={{
          alignSelf: mine ? 'flex-end' : 'flex-start',
          maxWidth: '80%',
          // La celda de una lista invertida está volteada, así que el margen
          // inferior es el que se ve arriba: el hueco contra el mensaje previo.
          marginBottom: groupedWithPrevious ? GROUPED_BUBBLE_GAP : BUBBLE_GAP,
          borderRadius: radii.lg,
          // El vértice pegado a quien envía se achata — es lo mínimo que
          // hace falta para leer "burbuja de chat" en vez de "tarjeta".
          borderBottomRightRadius: mine ? 4 : radii.lg,
          borderBottomLeftRadius: mine ? radii.lg : 4,
          borderWidth: item.id === focusedStoryReplyMessageId ? 2 : 0,
          borderColor: colors.volt,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          backgroundColor: mine ? colors.volt : colors.surfaceLow,
        }}
      >
        {item.storyReference ? (
          <Text accessibilityLabel="Referencia a una story" style={{ color: mutedOnBubble, fontSize: fontSizes.xs, marginBottom: spacing.xs }}>
            {storyReferenceLabel(item.storyReference.available)}
          </Text>
        ) : null}
        {renderMessageContent(item, mine)}
        {item.editedAt ? (
          <Text accessibilityLabel="Mensaje editado" style={{ color: mutedOnBubble, fontSize: 10, alignSelf: 'flex-end' }}>
            Editado
          </Text>
        ) : null}
        {mine && currentUserId && canWrite && canEditMessage(item, currentUserId) && !deletedMessageIdsRef.current.has(item.id) ? (
          <PressableScale
            accessibilityLabel="Editar mensaje"
            disabled={recordingAudio}
            haptic="none"
            onPress={() => beginMessageEdit(item)}
            scaleTo={0.95}
            style={{ alignSelf: 'flex-start', marginTop: spacing.xs }}
            testID={`chat-message-edit-${item.id}`}
          >
            <Text style={{ color: mutedOnBubble, fontSize: fontSizes.xs, fontWeight: semibold }}>Editar</Text>
          </PressableScale>
        ) : null}
        <View style={{ flexDirection: 'row', alignSelf: 'flex-end', alignItems: 'center', gap: 3, marginTop: 2 }}>
          <Text style={{ color: mine ? 'rgba(11,15,13,0.55)' : colors.textMuted, fontSize: 10 }}>
            {formatTimeOfDay(item.createdAt) ?? ''}
          </Text>
          {mine ? (
            <Ionicons
              color={isMessageReadByOther(item.createdAt, otherLastReadAt, otherReadReceiptsSince)
                ? READ_TICK_COLOR
                : 'rgba(11,15,13,0.55)'}
              name={
                otherLastDeliveredAt && item.createdAt <= otherLastDeliveredAt ? 'checkmark-done' : 'checkmark'
              }
              size={13}
            />
          ) : null}
        </View>
      </Animated.View>
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

  // Mismos márgenes que `ScrollScreen`, pero armados acá: un hilo de chat
  // necesita una lista virtualizada e invertida, no el `ScrollView` compartido.
  const gutter = Math.max(spacing.lg, (width - (wide ? maxWideContentWidth : maxContentWidth)) / 2);
  const topInset = Math.max(insets.top, StatusBar.currentHeight ?? 0);

  return (
    <>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <AmbientBackground />
        <KeyboardAvoidingView
          // Android reduce la ventana con el teclado abierto; iOS no, y sin esto
          // el redactor queda detrás del teclado justo mientras se escribe.
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{
            flex: 1,
            paddingTop: topInset + spacing.xl,
            paddingBottom: insets.bottom + spacing.md,
            paddingLeft: gutter + insets.left,
            paddingRight: gutter + insets.right,
          }}
        >
          <BackLink />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md }}>
            <View>
              {otherPhotoUrl ? (
                <Image
                  contentFit="cover"
                  source={{ uri: otherPhotoUrl }}
                  style={{ width: 48, height: 48, borderRadius: radii.full, backgroundColor: colors.surfaceHigh }}
                />
              ) : (
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: radii.full,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: colors.volt,
                  }}
                >
                  <Text style={{ color: colors.background, fontSize: fontSizes.md, fontWeight: '700' }}>
                    {initialsOf(otherName, undefined)}
                  </Text>
                </View>
              )}
              {otherOnline ? (
                <View
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: 13,
                    height: 13,
                    borderRadius: radii.full,
                    backgroundColor: colors.success,
                    borderWidth: 2,
                    borderColor: colors.background,
                  }}
                />
              ) : null}
            </View>
            <View style={{ flex: 1, gap: 1 }}>
              {editingNickname ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                  <TextInput
                    autoFocus
                    keyboardAppearance="dark"
                    maxLength={60}
                    onChangeText={setNicknameDraft}
                    onSubmitEditing={saveNickname}
                    placeholder={otherName}
                    placeholderTextColor={colors.textDisabled}
                    returnKeyType="done"
                    style={{
                      flex: 1,
                      color: colors.text,
                      fontSize: fontSizes.lg,
                      fontWeight: semibold,
                      borderBottomWidth: 1,
                      borderColor: colors.border,
                      paddingVertical: 2,
                    }}
                    value={nicknameDraft}
                  />
                  <PressableScale
                    accessibilityLabel="Guardar apodo"
                    hitSlop={spacing.sm}
                    onPress={saveNickname}
                    scaleTo={0.9}
                  >
                    <Ionicons color={colors.volt} name="checkmark" size={iconSizes.md} />
                  </PressableScale>
                  <PressableScale
                    accessibilityLabel="Cancelar"
                    haptic="none"
                    hitSlop={spacing.sm}
                    onPress={() => setEditingNickname(false)}
                    scaleTo={0.9}
                  >
                    <Ionicons color={colors.textMuted} name="close" size={iconSizes.md} />
                  </PressableScale>
                </View>
              ) : (
                <PressableScale
                  accessibilityHint="Ponerle un apodo privado a esta conversación"
                  accessibilityLabel={`${displayName ?? 'Conversación'}, tocar para editar apodo`}
                  haptic="none"
                  onPress={startEditingNickname}
                  scaleTo={0.98}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}
                >
                  <Text
                    numberOfLines={1}
                    style={{
                      flexShrink: 1,
                      color: colors.text,
                      fontSize: fontSizes.lg,
                      fontWeight: semibold,
                      letterSpacing: fontSizes.lg * -0.02,
                    }}
                  >
                    {displayName ?? 'Conversación'}
                  </Text>
                  <Ionicons color={colors.textMuted} name="pencil-outline" size={fontSizes.sm} />
                </PressableScale>
              )}
              <Text style={{ color: otherOnline ? colors.success : colors.textMuted, fontSize: fontSizes.xs }}>
                {presenceLabel(otherOnline, otherLastSeenAt)}
              </Text>
            </View>
            <PressableScale
              accessibilityLabel="Más opciones de conversación"
              accessibilityRole="button"
              disabled={!readReceiptSettings.data}
              onPress={() => setReadReceiptMenuOpen(true)}
              style={{
                width: minTouchTarget,
                height: minTouchTarget,
                borderRadius: radii.full,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.surfaceHigh,
              }}
            >
              <Ionicons color={colors.text} name="ellipsis-vertical" size={iconSizes.md} />
            </PressableScale>
          </View>

          {otherConversation?.systemKind === null && canWrite && otherUserId ? (
            <Button
              icon="barbell-outline"
              label="Entrenemos juntos"
              onPress={() => setInviteModalOpen(true)}
              variant="ghost"
            />
          ) : null}
          {otherConversation?.systemKind === null && otherUserId ? (
            <CreateTrainingInviteModal
              onClose={() => setInviteModalOpen(false)}
              recipientId={otherUserId}
              recipientName={otherName ?? 'tu conexión'}
              visible={inviteModalOpen && canWrite}
            />
          ) : null}

          {storyReplyNotFound ? (
            <Text accessibilityLiveRegion="polite" style={{ color: colors.textMuted, fontSize: fontSizes.xs, textAlign: 'center', paddingVertical: spacing.xs }}>
              No se encontró la respuesta a la story en el historial consultado.
            </Text>
          ) : null}
          <FlatList
            // Invertida: el hilo se lee desde el final, que es donde queda el
            // desplazamiento cero — un mensaje nuevo aparece sin tener que
            // perseguirlo con `scrollToEnd`, y traer páginas viejas (que entran
            // por el otro extremo) no mueve lo que se está mirando.
            contentContainerStyle={{ paddingVertical: spacing.xs }}
            data={timeline}
            inverted
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            keyExtractor={(message) => message.id}
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
                <ActivityIndicator color={colors.volt} style={{ marginVertical: spacing.md }} />
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
            renderItem={renderMessage}
            showsVerticalScrollIndicator={false}
            style={{ flex: 1 }}
          />

          {canWrite ? (
            <View style={{ gap: spacing.xs, paddingTop: spacing.sm }}>
              {editingMessageId ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ color: colors.volt, fontSize: fontSizes.xs, fontWeight: semibold }}>Editando mensaje</Text>
                  <PressableScale
                    accessibilityLabel="Cancelar edición"
                    haptic="none"
                    onPress={cancelMessageEdit}
                    style={{ paddingHorizontal: spacing.sm, paddingVertical: spacing.xs }}
                  >
                    <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>Cancelar</Text>
                  </PressableScale>
                </View>
              ) : null}
              {viewOnceNext ? (
                <Text style={{ color: colors.volt, fontSize: fontSizes.xs, fontWeight: semibold }}>
                  Vista única activada — se aplica a la próxima foto o video.
                </Text>
              ) : null}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.xs,
                  borderRadius: radii.lg,
                  borderWidth: 1,
                  borderColor: colors.borderSubtle,
                  backgroundColor: colors.surface,
                  padding: spacing.sm,
                }}
              >
                {/* Los cuatro iconos del compositor: antes eran `Pressable` mudos
                    de 24 px, que es justo el control que se toca muchas veces
                    seguidas y del que más se espera respuesta. Hundimiento sin
                    háptico —abren cosas, no confirman nada— y un área de toque
                    ampliada hasta los 44 pt. */}
                <PressableScale
                  accessibilityLabel="Emojis"
                  disabled={sendingMedia}
                  haptic="none"
                  hitSlop={spacing.sm}
                  onPress={() => setEmojiOpen(true)}
                  scaleTo={0.9}
                  style={{ padding: 6 }}
                >
                  <Ionicons color={colors.textMuted} name="happy-outline" size={iconSizes.md} />
                </PressableScale>
                <PressableScale
                  accessibilityLabel="Adjuntar foto o video"
                  disabled={Boolean(editingMessageId) || sendingMedia}
                  haptic="none"
                  hitSlop={spacing.sm}
                  onPress={() => void handleAttach()}
                  scaleTo={0.9}
                  style={{ padding: 6 }}
                >
                  <Ionicons color={colors.textMuted} name="image-outline" size={iconSizes.md} />
                </PressableScale>
                <PressableScale
                  accessibilityLabel={recordingAudio ? 'Detener y enviar mensaje de voz' : 'Grabar mensaje de voz'}
                  accessibilityRole="button"
                  accessibilityState={{ selected: recordingAudio, disabled: Boolean(editingMessageId) || sending || sendingMedia }}
                  disabled={Boolean(editingMessageId) || sending || sendingMedia}
                  haptic="none"
                  hitSlop={spacing.sm}
                  onPress={() => void handleRecordAudio()}
                  scaleTo={0.9}
                  style={{ padding: 6 }}
                >
                  <Ionicons
                    color={recordingAudio ? colors.volt : colors.textMuted}
                    name={recordingAudio ? 'stop-circle' : 'mic-outline'}
                    size={iconSizes.md}
                  />
                </PressableScale>
                {recordingAudio ? (
                  <Text
                    accessibilityLabel={chatAudioRecordingDurationLabel(audioRecorderState.durationMillis)}
                    style={{ color: colors.volt, fontSize: fontSizes.xs, fontVariant: ['tabular-nums'] }}
                  >
                    {Math.floor(audioRecorderState.durationMillis / 1_000)}s
                  </Text>
                ) : null}
                <PressableScale
                  accessibilityLabel="Compartir ubicación"
                  disabled={Boolean(editingMessageId) || sendingMedia}
                  haptic="none"
                  hitSlop={spacing.sm}
                  onPress={() => void handleShareLocation()}
                  scaleTo={0.9}
                  style={{ padding: 6 }}
                >
                  <Ionicons color={colors.textMuted} name="location-outline" size={iconSizes.md} />
                </PressableScale>
                <PressableScale
                  accessibilityLabel="Vista única para la próxima foto o video"
                  accessibilityState={{ selected: viewOnceNext, disabled: Boolean(editingMessageId) || sendingMedia }}
                  disabled={Boolean(editingMessageId) || sendingMedia}
                  haptic="selection"
                  hitSlop={spacing.sm}
                  onPress={() => setViewOnceNext((current) => !current)}
                  scaleTo={0.9}
                  style={{ padding: 6 }}
                >
                  {/* El interruptor cambia de icono Y de color: se desvanece de
                      uno a otro en lugar de saltar, que es lo que dice «ahora
                      está activo» sin que haga falta leer nada. */}
                  <Animated.View entering={FadeIn.duration(DURATION.quick)} key={viewOnceNext ? 'on' : 'off'}>
                    <Ionicons
                      color={viewOnceNext ? colors.volt : colors.textMuted}
                      name={viewOnceNext ? 'eye' : 'eye-outline'}
                      size={iconSizes.md}
                    />
                  </Animated.View>
                </PressableScale>
                <TextInput
                  accessibilityLabel={editingMessageId ? 'Editar mensaje actual' : 'Escribe un mensaje'}
                  keyboardAppearance="dark"
                  onChangeText={setDraft}
                  placeholder={editingMessageId ? 'Edita tu mensaje…' : 'Escribe un mensaje…'}
                  placeholderTextColor={colors.textDisabled}
                  style={{
                    flex: 1,
                    minHeight: minTouchTarget,
                    color: colors.text,
                    fontSize: fontSizes.md,
                    paddingHorizontal: spacing.sm,
                  }}
                  value={draft}
                />
                <Button
                  accessibilityLabel={editingMessageId ? 'Guardar edición' : 'Enviar mensaje'}
                  icon={editingMessageId ? 'checkmark' : 'send'}
                  label=""
                  loading={sending || sendingMedia || savingEdit}
                  onPress={() => void (editingMessageId ? handleSaveMessageEdit() : handleSend())}
                  style={{ paddingHorizontal: spacing.md }}
                />
              </View>
            </View>
          ) : (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: spacing.xs,
                marginTop: spacing.sm,
                borderRadius: radii.lg,
                borderWidth: 1,
                borderColor: colors.borderSubtle,
                backgroundColor: colors.surface,
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

        {/* Banda opaca sobre la barra de estado: sin ella el hilo se desliza
            bajo el reloj y la batería y los dos quedan ilegibles. */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: topInset,
            backgroundColor: colors.background,
          }}
        />
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
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' }}
        >
          {visibleViewerUri ? (
            <Image
              cachePolicy="none"
              contentFit="contain"
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
        onClose={() => setEmojiOpen(false)}
        onEmojiSelected={(selection) => setDraft((current) => current + selection.emoji)}
        open={emojiOpen}
      />
      <Modal
        animationType="fade"
        onRequestClose={() => setReadReceiptMenuOpen(false)}
        transparent
        visible={readReceiptMenuOpen}
      >
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.52)' }}>
          <Pressable
            accessibilityLabel="Cerrar opciones"
            onPress={() => setReadReceiptMenuOpen(false)}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
          <View
            style={{
              gap: spacing.sm,
              padding: spacing.lg,
              paddingBottom: Math.max(insets.bottom, spacing.lg),
              borderTopLeftRadius: radii.xl,
              borderTopRightRadius: radii.xl,
              backgroundColor: colors.surface,
              borderColor: colors.borderSubtle,
              borderWidth: 1,
            }}
          >
            <Text style={{ color: colors.text, fontSize: fontSizes.lg, fontWeight: semibold }}>
              Confirmación de lectura
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, lineHeight: 20 }}>
              El visto aparece solo si ambos lo permiten. Puedes cambiar este chat o aplicar el ajuste a todos.
            </Text>
            <PressableScale
              accessibilityRole="button"
              disabled={!readReceiptSettings.data || updateReadReceiptSettings.isPending}
              onPress={() => {
                const settings = readReceiptSettings.data;
                if (!settings) return;
                updateReadReceiptSettings.mutate({
                  scope: 'CONVERSATION',
                  conversationId,
                  enabled: !settings.enabled,
                  expectedVersion: settings.version,
                });
              }}
              style={{ padding: spacing.md, borderRadius: radii.md, backgroundColor: colors.surfaceHigh }}
            >
              <Text style={{ color: colors.text, fontSize: fontSizes.md }}>
                {readReceiptSettings.data?.enabled ? 'Desactivar solo en este chat' : 'Activar solo en este chat'}
              </Text>
            </PressableScale>
            <PressableScale
              accessibilityRole="button"
              disabled={!conversations.data?.length || !readReceiptSettings.data}
              onPress={() => {
                setSelectedReceiptConversationIds([conversationId]);
                setReadReceiptMenuOpen(false);
                setReadReceiptSelectionOpen(true);
              }}
              style={{ padding: spacing.md, borderRadius: radii.md, backgroundColor: colors.surfaceHigh }}
            >
              <Text style={{ color: colors.text, fontSize: fontSizes.md }}>Elegir conversaciones…</Text>
            </PressableScale>
            <PressableScale
              accessibilityRole="button"
              disabled={!readReceiptSettings.data || updateReadReceiptSettings.isPending}
              onPress={() => {
                const settings = readReceiptSettings.data;
                if (!settings) return;
                updateReadReceiptSettings.mutate({
                  scope: 'ALL',
                  enabled: !settings.defaultEnabled,
                  expectedVersion: settings.version,
                });
              }}
              style={{ padding: spacing.md, borderRadius: radii.md, backgroundColor: colors.surfaceHigh }}
            >
              <Text style={{ color: colors.text, fontSize: fontSizes.md }}>
                {readReceiptSettings.data?.defaultEnabled ? 'Desactivar en todos los chats' : 'Activar en todos los chats'}
              </Text>
            </PressableScale>
            <Button label="Cerrar" onPress={() => setReadReceiptMenuOpen(false)} variant="ghost" />
          </View>
        </View>
      </Modal>
      <Modal
        animationType="slide"
        onRequestClose={() => setReadReceiptSelectionOpen(false)}
        transparent
        visible={readReceiptSelectionOpen}
      >
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.52)' }}>
          <Pressable
            accessibilityLabel="Cerrar selección"
            onPress={() => setReadReceiptSelectionOpen(false)}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
          <View style={{ maxHeight: '78%', gap: spacing.sm, padding: spacing.lg, paddingBottom: Math.max(insets.bottom, spacing.lg), borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, backgroundColor: colors.surface }}>
            <Text style={{ color: colors.text, fontSize: fontSizes.lg, fontWeight: semibold }}>Elegir conversaciones</Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>Selecciona los chats donde quieres cambiar el visto.</Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>Puedes seleccionar hasta 100 conversaciones.</Text>
            <FlatList
              data={(conversations.data ?? []).filter((item) => item.systemKind === null && item.canWrite)}
              keyExtractor={(item) => item.conversationId}
              renderItem={({ item }) => {
                const selected = selectedReceiptConversationIds.includes(item.conversationId);
                return (
                  <Pressable
                    accessibilityHint={selected ? 'Seleccionada' : 'Toca para seleccionar'}
                    accessibilityLabel={item.nickname ?? item.otherUserName}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected, disabled: !selected && selectedReceiptConversationIds.length >= 100 }}
                    disabled={!selected && selectedReceiptConversationIds.length >= 100}
                    onPress={() => setSelectedReceiptConversationIds((current) => selected
                      ? current.filter((id) => id !== item.conversationId)
                      : current.length < 100 ? [...current, item.conversationId] : current)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm }}
                  >
                    <Ionicons color={colors.text} name={selected ? 'checkbox' : 'square-outline'} size={22} />
                    <Text numberOfLines={1} style={{ flex: 1, color: colors.text, fontSize: fontSizes.md }}>{item.nickname ?? item.otherUserName}</Text>
                  </Pressable>
                );
              }}
            />
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Button
                disabled={!readReceiptSettings.data || !selectedReceiptConversationIds.length || updateReadReceiptSettings.isPending}
                label="Desactivar"
                onPress={() => updateReadReceiptSettings.mutate({ scope: 'SELECTED', conversationIds: selectedReceiptConversationIds, enabled: false, expectedVersion: readReceiptSettings.data!.version })}
                variant="ghost"
              />
              <Button
                disabled={!readReceiptSettings.data || !selectedReceiptConversationIds.length || updateReadReceiptSettings.isPending}
                label="Activar"
                onPress={() => updateReadReceiptSettings.mutate({ scope: 'SELECTED', conversationIds: selectedReceiptConversationIds, enabled: true, expectedVersion: readReceiptSettings.data!.version })}
                variant="primary"
              />
            </View>
            <Button label="Cancelar" onPress={() => setReadReceiptSelectionOpen(false)} variant="ghost" />
          </View>
        </View>
      </Modal>
    </>
  );
}
