import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import EmojiPicker from 'rn-emoji-keyboard';
import type { Message } from '@gymsheet/schemas';
import { chatService } from '@/api/services';
import { useChatSocket, type PresenceUpdate, type ReceiptUpdate } from '@/hooks/use-chat-socket';
import { BackLink } from '@/components/nav';
import { AmbientBackground } from '@/components/ambient';
import { ScrollScreen, useResponsive } from '@/components/layout';
import { Button } from '@/components/ui';
import { EmptyState, ErrorState, Skeleton } from '@/components/feedback';
import { notify } from '@/notifications';
import { useAuthStore } from '@/state/auth-store';
import { formatTimeOfDay, initialsOf, presenceLabel } from '@/lib/format';
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

function mapsUrlFor(lat: number, lng: number): string {
  return `https://maps.google.com/?q=${lat},${lng}`;
}

function mergeMessages(existing: Message[], incoming: Message) {
  if (existing.some((message) => message.id === incoming.id)) return existing;
  return [...existing, incoming];
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
  const { id: conversationId } = useLocalSearchParams<{ id: string }>();
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

  const history = useQuery({
    queryKey: ['chat', 'messages', conversationId],
    queryFn: () => chatService.listMessages(conversationId, { limit: PAGE_SIZE }),
    enabled: Boolean(conversationId),
  });
  const conversations = useQuery({
    queryKey: ['chat', 'conversations'],
    queryFn: () => chatService.listConversations(),
  });

  const [liveMessages, setLiveMessages] = useState<Message[]>([]);
  const [olderMessages, setOlderMessages] = useState<Message[]>([]);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [reachedStart, setReachedStart] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [livePresence, setLivePresence] = useState<PresenceUpdate | null>(null);
  const [liveReceipt, setLiveReceipt] = useState<ReceiptUpdate | null>(null);
  const [editingNickname, setEditingNickname] = useState(false);
  const [nicknameDraft, setNicknameDraft] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [viewOnceNext, setViewOnceNext] = useState(false);
  const [sendingMedia, setSendingMedia] = useState(false);
  const [viewerUri, setViewerUri] = useState<string | null>(null);
  // Vista única: la URL real solo llega una vez del backend — se guarda acá
  // para poder volver a mostrarla dentro de esta misma sesión de pantalla.
  const [revealedMedia, setRevealedMedia] = useState<Record<string, RevealedMedia>>({});

  const otherConversation = conversations.data?.find(
    (conversation) => conversation.conversationId === conversationId,
  );
  const otherName = otherConversation?.otherUserName;
  const otherPhotoUrl = otherConversation?.otherUserPhotoUrl ?? null;
  const otherUserId = otherConversation?.otherUserId;
  const canWrite = otherConversation?.canWrite !== false;
  const displayName = otherConversation?.nickname ?? otherName;

  const setNickname = useMutation({
    mutationFn: (nickname: string | null) => chatService.setNickname(conversationId, nickname),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
    },
    onError: (error: Error) => notify.error(error.message),
  });

  const { connectionState, joinConversation, sendMessage } = useChatSocket(
    (incoming) => {
      if (incoming.conversationId !== conversationId) return;
      setLiveMessages((current) => mergeMessages(current, incoming));
    },
    (presence) => {
      if (presence.userId !== otherUserId) return;
      setLivePresence(presence);
    },
    (receipt) => {
      if (receipt.userId !== otherUserId) return;
      setLiveReceipt(receipt);
    },
  );

  // Cambiar de hilo sin desmontar la pantalla (la ruta es la misma, sólo cambia
  // el parámetro) dejaba mensajes del hilo anterior mezclados con los nuevos.
  useEffect(() => {
    setLiveMessages([]);
    setOlderMessages([]);
    setReachedStart(false);
    joinedRef.current = null;
    markedReadRef.current = null;
  }, [conversationId]);

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
  const messages = useMemo(
    () => dedupeById([olderMessages, history.data ?? [], liveMessages]),
    [history.data, liveMessages, olderMessages],
  );
  /** La lista se pinta invertida, así que los datos van del más nuevo al más viejo. */
  const timeline = useMemo(() => [...messages].reverse(), [messages]);

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
      if (page.length) setOlderMessages((current) => dedupeById([page, current]));
    } catch (error: unknown) {
      notify.error(
        error instanceof Error ? error.message : 'No se pudieron cargar los mensajes anteriores.',
      );
    } finally {
      setLoadingOlder(false);
    }
  }, [conversationId, hasMoreOlder, loadingOlder, oldestLoadedAt]);

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
      setLiveMessages((current) => mergeMessages(current, message));
      scrollToLatest();
    },
    [scrollToLatest],
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
    (liveReceipt?.deliveredAt ?? liveReceipt?.readAt) ?? otherConversation?.otherUserLastDeliveredAt ?? null;
  const otherLastReadAt = liveReceipt?.readAt ?? otherConversation?.otherUserLastReadAt ?? null;

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

  async function handleAttach() {
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
    if (!asset || !conversationId) return;

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
    if (!conversationId) return;
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) {
      notify.error('Se necesita acceso a tu ubicación para compartirla.');
      return;
    }
    setSendingMedia(true);
    try {
      const position = await Location.getCurrentPositionAsync({});
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
    if (!body || !conversationId) return;
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

  /** Contenido de la burbuja según el tipo de mensaje — el marco (fondo, radios) es igual para todos. */
  function renderMessageContent(message: Message, mine: boolean) {
    const textColor = mine ? colors.background : colors.text;
    const mutedOnBubble = mine ? 'rgba(11,15,13,0.65)' : colors.textMuted;

    if (message.type === 'location' && message.locationLat !== null && message.locationLng !== null) {
      return (
        <Pressable
          onPress={() => void Linking.openURL(mapsUrlFor(message.locationLat as number, message.locationLng as number))}
          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}
        >
          <Ionicons color={textColor} name="location" size={iconSizes.md} />
          <View>
            <Text style={{ color: textColor, fontSize: fontSizes.sm, fontWeight: semibold }}>Ubicación compartida</Text>
            <Text style={{ color: mutedOnBubble, fontSize: fontSizes.xs }}>Toca para abrir en el mapa</Text>
          </View>
        </Pressable>
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
          <Pressable
            disabled={viewOnceOpen.isPending}
            onPress={() => viewOnceOpen.mutate(message.id)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}
          >
            <Ionicons color={textColor} name="eye-outline" size={iconSizes.md} />
            <Text style={{ color: textColor, fontSize: fontSizes.sm, fontWeight: semibold }}>
              Toca para ver una vez
            </Text>
          </Pressable>
        );
      }

      if (!url) {
        // Sin vista única y sin URL: no debería pasar, pero no hay nada que dibujar.
        return <Text style={{ color: mutedOnBubble, fontSize: fontSizes.sm }}>Contenido no disponible.</Text>;
      }

      if (message.type === 'video') {
        return (
          <Pressable
            onPress={() => void Linking.openURL(url)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}
          >
            <Ionicons color={textColor} name="play-circle-outline" size={iconSizes.lg} />
            <Text style={{ color: textColor, fontSize: fontSizes.sm, fontWeight: semibold }}>Video</Text>
          </Pressable>
        );
      }

      return (
        <Pressable onPress={() => setViewerUri(url)}>
          <Image
            contentFit="cover"
            source={{ uri: url }}
            style={{ width: 220, height: 220, borderRadius: radii.md, backgroundColor: colors.surfaceHigh }}
          />
          {message.body ? (
            <Text style={{ color: textColor, fontSize: fontSizes.sm, marginTop: spacing.xs }}>{message.body}</Text>
          ) : null}
        </Pressable>
      );
    }

    return (
      <Text style={{ color: textColor, fontSize: fontSizes.sm, lineHeight: fontSizes.sm * 1.35 }}>
        {message.body}
      </Text>
    );
  }

  function renderMessage({ item, index }: ListRenderItemInfo<Message>) {
    const mine = item.senderId === currentUserId;
    // Los datos van del más nuevo al más viejo: el anterior en el tiempo es el
    // siguiente del arreglo, y en pantalla queda justo encima de este.
    const previous = timeline[index + 1];
    const groupedWithPrevious = previous?.senderId === item.senderId;
    return (
      <View
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
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          backgroundColor: mine ? colors.volt : colors.surfaceLow,
        }}
      >
        {renderMessageContent(item, mine)}
        <View style={{ flexDirection: 'row', alignSelf: 'flex-end', alignItems: 'center', gap: 3, marginTop: 2 }}>
          <Text style={{ color: mine ? 'rgba(11,15,13,0.55)' : colors.textMuted, fontSize: 10 }}>
            {formatTimeOfDay(item.createdAt) ?? ''}
          </Text>
          {mine ? (
            <Ionicons
              color={
                otherLastReadAt && item.createdAt <= otherLastReadAt ? READ_TICK_COLOR : 'rgba(11,15,13,0.55)'
              }
              name={
                otherLastDeliveredAt && item.createdAt <= otherLastDeliveredAt ? 'checkmark-done' : 'checkmark'
              }
              size={13}
            />
          ) : null}
        </View>
      </View>
    );
  }

  if (history.isPending) {
    return (
      <ScrollScreen>
        <BackLink />
        <Skeleton height={300} />
      </ScrollScreen>
    );
  }
  if (history.isError) {
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
                  <Pressable accessibilityLabel="Guardar apodo" accessibilityRole="button" onPress={saveNickname}>
                    <Ionicons color={colors.volt} name="checkmark" size={iconSizes.md} />
                  </Pressable>
                  <Pressable
                    accessibilityLabel="Cancelar"
                    accessibilityRole="button"
                    onPress={() => setEditingNickname(false)}
                  >
                    <Ionicons color={colors.textMuted} name="close" size={iconSizes.md} />
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  accessibilityHint="Ponerle un apodo privado a esta conversación"
                  accessibilityLabel={`${displayName ?? 'Conversación'}, tocar para editar apodo`}
                  onPress={startEditingNickname}
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
                </Pressable>
              )}
              <Text style={{ color: otherOnline ? colors.success : colors.textMuted, fontSize: fontSizes.xs }}>
                {presenceLabel(otherOnline, otherLastSeenAt)}
              </Text>
            </View>
          </View>

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
                message="Escribe el primero y empieza la conversación."
                title="Todavía no hay mensajes"
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
            ref={listRef}
            renderItem={renderMessage}
            showsVerticalScrollIndicator={false}
            style={{ flex: 1 }}
          />

          {canWrite ? (
            <View style={{ gap: spacing.xs, paddingTop: spacing.sm }}>
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
                <Pressable
                  accessibilityLabel="Emojis"
                  accessibilityRole="button"
                  disabled={sendingMedia}
                  onPress={() => setEmojiOpen(true)}
                  style={{ padding: 6 }}
                >
                  <Ionicons color={colors.textMuted} name="happy-outline" size={iconSizes.md} />
                </Pressable>
                <Pressable
                  accessibilityLabel="Adjuntar foto o video"
                  accessibilityRole="button"
                  disabled={sendingMedia}
                  onPress={() => void handleAttach()}
                  style={{ padding: 6 }}
                >
                  <Ionicons color={colors.textMuted} name="image-outline" size={iconSizes.md} />
                </Pressable>
                <Pressable
                  accessibilityLabel="Compartir ubicación"
                  accessibilityRole="button"
                  disabled={sendingMedia}
                  onPress={() => void handleShareLocation()}
                  style={{ padding: 6 }}
                >
                  <Ionicons color={colors.textMuted} name="location-outline" size={iconSizes.md} />
                </Pressable>
                <Pressable
                  accessibilityLabel="Vista única para la próxima foto o video"
                  accessibilityRole="button"
                  accessibilityState={{ selected: viewOnceNext }}
                  disabled={sendingMedia}
                  onPress={() => setViewOnceNext((current) => !current)}
                  style={{ padding: 6 }}
                >
                  <Ionicons
                    color={viewOnceNext ? colors.volt : colors.textMuted}
                    name={viewOnceNext ? 'eye' : 'eye-outline'}
                    size={iconSizes.md}
                  />
                </Pressable>
                <TextInput
                  keyboardAppearance="dark"
                  onChangeText={setDraft}
                  placeholder="Escribe un mensaje…"
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
                  icon="send"
                  label=""
                  loading={sending || sendingMedia}
                  onPress={() => void handleSend()}
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
        visible={Boolean(viewerUri)}
      >
        <Pressable
          accessibilityLabel="Cerrar"
          accessibilityRole="button"
          onPress={() => setViewerUri(null)}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' }}
        >
          {viewerUri ? (
            <Image contentFit="contain" source={{ uri: viewerUri }} style={{ width: '100%', height: '80%' }} />
          ) : null}
        </Pressable>
      </Modal>
      <EmojiPicker
        onClose={() => setEmojiOpen(false)}
        onEmojiSelected={(selection) => setDraft((current) => current + selection.emoji)}
        open={emojiOpen}
      />
    </>
  );
}
