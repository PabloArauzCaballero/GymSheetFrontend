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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { ChatComposer } from '@/features/chat/chat-composer';
import {
  AttachSheet,
  ContactInfoSheet,
  DeleteMessageSheet,
  MessageActionsSheet,
  disappearingModeLabel,
} from '@/features/chat/chat-sheets';
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
import EmojiPicker from 'rn-emoji-keyboard';
import type { ConversationSummary, Message } from '@gymsheet/schemas';
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
import { env } from '@/config/env';
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
import { chatAudioPlayerAccessibilityLabel, chatAudioPlayerSource } from '@/lib/chat-audio';
import {
  bubbleInkFaint,
  bubbleInkMuted,
  colors,
  fontSizes,
  iconSizes,
  maxContentWidth,
  maxWideContentWidth,
  minTouchTarget,
  overlay,
  radii,
  readReceiptTick,
  semibold,
  spacing,
} from '@/theme';

const READ_TICK_COLOR = readReceiptTick;

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

function ChatAudioMessage({ uri, token, mine, onLoadError }: {
  uri: string;
  token: string | null;
  mine: boolean;
  /** No cargó: casi siempre el token de 15 min venció; la pantalla lo renueva y el reproductor se rehace. */
  onLoadError: () => void;
}) {
  const source = token ? chatAudioPlayerSource(uri, env.apiUrl, token) : null;
  const player = useAudioPlayer(source, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);
  const unavailable = Boolean(status.error);
  useEffect(() => {
    if (status.error) onLoadError();
  }, [onLoadError, status.error]);
  const time = status.currentTime > 0 ? status.currentTime : status.duration;
  // En la burbuja propia el fondo ya es el acento: el control va en tinta oscura.
  const ink = mine ? colors.background : colors.volt;
  const track = mine ? bubbleInkFaint : colors.surfaceHigh;
  const label = mine ? bubbleInkMuted : colors.textMuted;

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
        <Ionicons color={ink} name={status.playing ? 'pause' : 'play'} size={iconSizes.lg} />
      </PressableScale>
      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ height: 3, overflow: 'hidden', borderRadius: radii.full, backgroundColor: track }}>
          <View style={{ width: `${status.duration > 0 ? Math.min(100, (status.currentTime / status.duration) * 100) : 0}%`, height: 3, backgroundColor: ink }} />
        </View>
        <Text
          accessibilityLabel={chatAudioPlayerAccessibilityLabel(status.isLoaded, status.currentTime, status.duration)}
          style={{ color: label, fontSize: fontSizes.xs }}
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
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [sendingMedia, setSendingMedia] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [pickedMedia, setPickedMedia] = useState<PickedMedia | null>(null);
  const [actionMessage, setActionMessage] = useState<Message | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Message | null>(null);
  const [hiddenMessageIds, setHiddenMessageIds] = useState<Set<string>>(() => new Set());
  const router = useRouter();
  const [focusedStoryReplyMessageId, setFocusedStoryReplyMessageId] = useState<string | null>(null);
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
  const timeline = useMemo(
    () => [...messages].reverse().filter((message) =>
      !hiddenMessageIds.has(message.id) &&
      // Un mensaje temporal que caduca con el chat abierto desaparece aquí también.
      !(message.expiresAt && Date.parse(message.expiresAt) <= expiryClock)),
    [expiryClock, hiddenMessageIds, messages],
  );
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
    if (action === 'copy') {
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
      const sent = await chatService.sendMediaMessage(conversationId, result.file, { type: 'audio', viewOnce: false });
      showOwnMessage(sent);
    } catch (error: unknown) {
      notify.error(error instanceof Error ? error.message : 'No se pudo enviar el mensaje de voz.');
    } finally {
      setSendingMedia(false);
      finishingVoiceRef.current = false;
    }
  }
  voiceLimitRef.current = () => void finishVoiceNote(true);

  function pickedFrom(asset: ImagePicker.ImagePickerAsset): PickedMedia {
    const isVideo = asset.type === 'video' || (asset.mimeType ?? '').startsWith('video/');
    const mimeType = asset.mimeType ?? (isVideo ? 'video/mp4' : 'image/jpeg');
    return {
      uri: asset.uri,
      name: asset.fileName ?? (isVideo ? 'video.mp4' : 'photo.jpg'),
      mimeType,
      kind: isVideo ? 'video' : 'image',
    };
  }

  async function pickFromGallery() {
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
    if (asset) setPickedMedia(pickedFrom(asset));
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
        { type: media.kind, viewOnce, ...(caption ? { body: caption } : {}) },
      );
      showOwnMessage(sent);
      setPickedMedia(null);
    } catch (error: unknown) {
      notify.error(error instanceof Error ? error.message : 'No se pudo enviar el archivo.');
    } finally {
      setSendingMedia(false);
    }
  }

  /** «Ubicación»: una pantalla con «mi ubicación actual» y el mapa para elegir un lugar. */
  function openPlacePicker() {
    if (!conversationId || !canWrite) return;
    router.push({ pathname: '/chat/lugar', params: { conversationId } });
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

  function beginMessageEdit(message: Message): boolean {
    if (!currentUserId || !canWrite) return false;
    if (!canEditMessage(message, currentUserId)) {
      notify.info('Solo puedes editar tus mensajes de texto durante 15 minutos.');
      return false;
    }
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

  /** Contenido de la burbuja según el tipo de mensaje — el marco (fondo, radios) es igual para todos. */
  function renderMessageContent(message: Message, mine: boolean, onLongPress: () => void) {
    const textColor = mine ? colors.background : colors.text;
    const mutedOnBubble = mine ? bubbleInkMuted : colors.textMuted;

    if (isTombstone(message, deletedMessageIds)) {
      return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <Ionicons color={colors.textMuted} name="ban-outline" size={iconSizes.sm} />
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, fontStyle: 'italic' }}>{tombstoneLabel(mine)}</Text>
        </View>
      );
    }

    if (message.type === 'audio') {
      return message.mediaUrl
        ? <ChatAudioMessage mine={mine} onLoadError={onMediaError} token={mediaAccessToken} uri={message.mediaUrl} />
        : <Text style={{ color: mutedOnBubble, fontSize: fontSizes.sm }}>Este audio ya no está disponible.</Text>;
    }

    if (message.type === 'location' && message.locationLat !== null && message.locationLng !== null) {
      return (
        <PressableScale
          haptic="none"
          onLongPress={onLongPress}
          onPress={() => void Linking.openURL(mapsUrlFor(message.locationLat as number, message.locationLng as number))}
          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}
        >
          <Ionicons color={textColor} name="location" size={iconSizes.md} />
          <View style={{ flexShrink: 1 }}>
            <Text numberOfLines={2} style={{ color: textColor, fontSize: fontSizes.sm, fontWeight: semibold }}>
              {message.locationLabel ?? 'Ubicación compartida'}
            </Text>
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
            onLongPress={onLongPress}
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
        <PressableScale accessibilityLabel="Abrir foto" haptic="none" onLongPress={onLongPress} onPress={() => setViewerUri(url)} scaleTo={0.98}>
          <Image
            cachePolicy="none"
            contentFit="cover"
            onError={onMediaError}
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
      const line = chatSystemEventMessage(item.systemEvent, currentUserId, displayName);
      const timer = item.systemEvent.kind === 'DISAPPEARING_MESSAGES_CHANGED';
      return (
        <Animated.View
          style={{
            alignSelf: 'stretch',
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: spacing.xs,
            marginVertical: spacing.sm,
            paddingHorizontal: spacing.md,
          }}
        >
          {timer ? <Ionicons color={colors.textMuted} name="timer-outline" size={iconSizes.sm} /> : null}
          <Text
            accessibilityLabel={line}
            accessibilityLiveRegion="polite"
            accessibilityRole="text"
            style={{ flexShrink: 1, color: colors.textMuted, fontSize: fontSizes.xs, lineHeight: fontSizes.xs * 1.5, textAlign: 'center' }}
          >
            {line}
          </Text>
        </Animated.View>
      );
    }
    const mine = item.senderId === currentUserId;
    const mutedOnBubble = mine ? bubbleInkMuted : colors.textMuted;
    // Los datos van del más nuevo al más viejo: el anterior en el tiempo es el
    // siguiente del arreglo, y en pantalla queda justo encima de este.
    const previous = timeline[index + 1];
    const groupedWithPrevious = previous?.senderId === item.senderId;
    const baseline = newestAtOpen.current;
    const arrivedLater = baseline !== null && item.createdAt > baseline;
    const tombstone = isTombstone(item, deletedMessageIds);
    const openActions = () => {
      if (!currentUserId) return;
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setActionMessage(item);
    };
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
          backgroundColor: tombstone ? colors.surfaceLow : mine ? colors.volt : colors.surfaceLow,
        }}
      >
        {item.storyReference ? (
          <Text accessibilityLabel="Referencia a una story" style={{ color: mutedOnBubble, fontSize: fontSizes.xs, marginBottom: spacing.xs }}>
            {storyReferenceLabel(item.storyReference.available)}
          </Text>
        ) : null}
        <Pressable
          accessibilityHint="Mantén pulsado para copiar, editar o eliminar"
          delayLongPress={300}
          onLongPress={openActions}
          testID={`chat-message-${item.id}`}
        >
          {renderMessageContent(item, mine, openActions)}
          <View style={{ flexDirection: 'row', alignSelf: 'flex-end', alignItems: 'center', gap: 3, marginTop: 2 }}>
            {item.expiresAt && !tombstone ? (
              <Ionicons
                accessibilityLabel="Mensaje temporal"
                color={mine ? bubbleInkFaint : colors.textMuted}
                name="timer-outline"
                size={12}
              />
            ) : null}
            {item.editedAt && !tombstone ? (
              <Text accessibilityLabel="Mensaje editado" style={{ color: mine && !tombstone ? bubbleInkFaint : colors.textMuted, fontSize: fontSizes.micro }}>
                Editado
              </Text>
            ) : null}
            <Text style={{ color: mine && !tombstone ? bubbleInkFaint : colors.textMuted, fontSize: fontSizes.micro }}>
              {formatTimeOfDay(item.createdAt) ?? ''}
            </Text>
            {mine && !tombstone ? (
              <Ionicons
                color={isMessageReadByOther(item.createdAt, otherLastReadAt, otherReadReceiptsSince)
                  ? READ_TICK_COLOR
                  : bubbleInkFaint}
                name={
                  otherLastDeliveredAt && item.createdAt <= otherLastDeliveredAt ? 'checkmark-done' : 'checkmark'
                }
                size={13}
              />
            ) : null}
          </View>
        </Pressable>
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
            paddingTop: topInset + spacing.sm,
            paddingBottom: insets.bottom + spacing.md,
            paddingLeft: gutter + insets.left,
            paddingRight: gutter + insets.right,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
            <PressableScale
              accessibilityLabel="Volver"
              haptic="none"
              hitSlop={spacing.sm}
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/comunidad'))}
              scaleTo={0.9}
              style={{ width: 32, height: minTouchTarget, alignItems: 'flex-start', justifyContent: 'center' }}
            >
              <Ionicons color={colors.text} name="chevron-back" size={iconSizes.lg + 2} />
            </PressableScale>
            {/* Como en WhatsApp: tocar la persona abre su info (apodo, visto,
                entrenar juntos). Antes el nombre se convertía en un campo de
                texto al tocarlo, con un lápiz pegado. */}
            <PressableScale
              accessibilityHint="Abre la info del contacto: apodo y confirmación de lectura"
              accessibilityLabel={`${displayName ?? 'Conversación'}, ${presenceLabel(otherOnline, otherLastSeenAt)}`}
              haptic="none"
              onPress={() => setContactOpen(true)}
              scaleTo={0.98}
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
              testID="chat-contact-header"
            >
              <View>
                {otherPhotoUrl ? (
                  <Image
                    contentFit="cover"
                    source={{ uri: otherPhotoUrl }}
                    style={{ width: 40, height: 40, borderRadius: radii.full, backgroundColor: colors.surfaceHigh }}
                  />
                ) : (
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: radii.full,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: colors.volt,
                    }}
                  >
                    <Text style={{ color: colors.background, fontSize: fontSizes.sm, fontWeight: '700' }}>
                      {initialsOf(otherName, undefined)}
                    </Text>
                  </View>
                )}
                {disappearingSeconds ? (
                  <View
                    accessibilityLabel={`Mensajes temporales: ${disappearingModeLabel(disappearingSeconds)}`}
                    style={{
                      position: 'absolute',
                      bottom: -2,
                      left: -2,
                      width: 18,
                      height: 18,
                      borderRadius: radii.full,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: colors.surfaceHigh,
                      borderWidth: 2,
                      borderColor: colors.background,
                    }}
                    testID="chat-header-disappearing"
                  >
                    <Ionicons color={colors.text} name="timer-outline" size={11} />
                  </View>
                ) : null}
                {otherOnline ? (
                  <View
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      right: 0,
                      width: 12,
                      height: 12,
                      borderRadius: radii.full,
                      backgroundColor: colors.success,
                      borderWidth: 2,
                      borderColor: colors.background,
                    }}
                  />
                ) : null}
              </View>
              <View style={{ flex: 1, gap: 1 }}>
                <Text
                  numberOfLines={1}
                  style={{
                    color: colors.text,
                    fontSize: fontSizes.callout,
                    fontWeight: semibold,
                    letterSpacing: fontSizes.callout * -0.01,
                  }}
                >
                  {displayName ?? 'Conversación'}
                </Text>
                <Text numberOfLines={1} style={{ color: otherOnline ? colors.success : colors.textMuted, fontSize: fontSizes.xs }}>
                  {presenceLabel(otherOnline, otherLastSeenAt)}
                  {disappearingSeconds ? ` · Temporales: ${disappearingModeLabel(disappearingSeconds)}` : ''}
                </Text>
              </View>
            </PressableScale>
            <PressableScale
              accessibilityLabel="Info. del contacto"
              accessibilityRole="button"
              haptic="none"
              onPress={() => setContactOpen(true)}
              scaleTo={0.9}
              style={{
                width: minTouchTarget,
                height: minTouchTarget,
                borderRadius: radii.full,
                alignItems: 'center',
                justifyContent: 'center',
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
            <View style={{ paddingTop: spacing.sm }}>
              <ChatComposer
                busy={sendingMedia}
                draft={draft}
                editing={editingMessageId ? { body: messages.find((message) => message.id === editingMessageId)?.body ?? '' } : null}
                onCancelEdit={cancelMessageEdit}
                onChangeDraft={setDraft}
                onOpenAttach={() => setAttachOpen(true)}
                onOpenCamera={() => void pickFromCamera()}
                onOpenEmoji={() => setEmojiOpen(true)}
                onSend={() => void (editingMessageId ? handleSaveMessageEdit() : handleSend())}
                focusRequest={composerFocusRequest}
                onVoiceStart={() => void startVoiceNote()}
                onVoiceStop={(send) => void finishVoiceNote(send)}
                recording={voice.recording}
                recordingMillis={voice.elapsedMs}
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
          style={{ flex: 1, backgroundColor: overlay.scrimSolid, alignItems: 'center', justifyContent: 'center' }}
        >
          {visibleViewerUri ? (
            <Image
              cachePolicy="none"
              contentFit="contain"
              onError={onMediaError}
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
      <AttachSheet
        onCamera={() => void pickFromCamera()}
        onClose={() => setAttachOpen(false)}
        onGallery={() => void pickFromGallery()}
        onLocation={openPlacePicker}
        onTrainTogether={otherConversation?.systemKind === null && otherUserId ? () => setInviteModalOpen(true) : null}
        visible={attachOpen}
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
        preview={actionMessage
          ? isTombstone(actionMessage, deletedMessageIds)
            ? tombstoneLabel(actionMessage.senderId === currentUserId)
            : actionMessage.body ?? (actionMessage.type === 'audio' ? 'Nota de voz'
              : actionMessage.type === 'location' ? (actionMessage.locationLabel ?? 'Ubicación')
                : actionMessage.type === 'video' ? 'Video' : 'Foto')
          : ''}
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
        allChatsReceiptsEnabled={readReceiptSettings.data?.defaultEnabled}
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
        onToggleAllChatsReceipts={() => {
          const settings = readReceiptSettings.data;
          if (!settings) return;
          updateReadReceiptSettings.mutate({
            scope: 'ALL',
            enabled: !settings.defaultEnabled,
            expectedVersion: settings.version,
          });
        }}
        onChooseChats={() => {
          setSelectedReceiptConversationIds([conversationId]);
          setContactOpen(false);
          setTimeout(() => setReadReceiptSelectionOpen(true), 350);
        }}
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
      <Modal
        animationType="slide"
        onRequestClose={() => setReadReceiptSelectionOpen(false)}
        transparent
        visible={readReceiptSelectionOpen}
      >
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: overlay.scrimSheet }}>
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
