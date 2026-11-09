import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Image } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
import { memo, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Linking, Text, View } from 'react-native';
import type { ChatMessage } from '@gymsheet/schemas';
import { PressableScale } from '@/components/motion';
import { env } from '@/config/env';
import { tombstoneLabel } from '@/hooks/chat-message-actions';
import { chatAudioPlayerAccessibilityLabel, isLocalAudioUri, shouldRewindBeforePlay } from '@/lib/chat-audio';
import { discardChatAudio, localChatAudioUri } from './chat-audio-cache';
import {
  accentPolicy,
  chatColors,
  colors,
  fontSizes,
  iconSizes,
  minTouchTarget,
  radii,
  semibold,
  spacing,
} from '@/theme';

/** Una foto a la que ya se le pidió la URL de vista única durante esta sesión de pantalla. */
export type RevealedMedia = { mediaUrl: string; mediaMimeType: string | null };

export function resolveChatMediaUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${env.apiUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

export function mapsUrlFor(lat: number, lng: number): string {
  return `https://maps.google.com/?q=${lat},${lng}`;
}

/** Tinta de la burbuja: clara sobre las dos (la propia ya no es el acento puro). */
export function bubbleInk(mine: boolean) {
  return { text: colors.text, muted: mine ? chatColors.metaOnMine : colors.textMuted };
}

const ChatVideo = memo(function ChatVideo({ uri, token }: { uri: string; token: string | null }) {
  const source = useMemo(
    () => (token ? { uri: resolveChatMediaUrl(uri), headers: { Authorization: `Bearer ${token}` }, useCaching: true } : null),
    [token, uri],
  );
  const player = useVideoPlayer(source, (videoPlayer) => videoPlayer.pause());
  if (!token) return null;
  return <VideoView nativeControls player={player} style={{ width: 240, height: 220, borderRadius: radii.md }} />;
});

/**
 * Una nota de voz. Se descarga una vez a la caché del dispositivo y se
 * reproduce desde ahí (ver `localChatAudioUri`); la recién grabada por quien
 * envía ya es local y suena mientras sube. Al terminar se rebobina, así que
 * se puede volver a escuchar cuantas veces se quiera — salvo la de escucha
 * única (`once`), que arranca sola, no se rebobina y se borra del disco al
 * terminar.
 */
const ChatAudioMessage = memo(function ChatAudioMessage({ messageId, uri, token, mine, onLoadError, once = false, onOnceFinished }: {
  messageId: string;
  uri: string;
  token: string | null;
  mine: boolean;
  /** No cargó: casi siempre el token de 15 min venció; la pantalla lo renueva y la descarga se reintenta. */
  onLoadError: () => void;
  once?: boolean;
  onOnceFinished?: () => void;
}) {
  const local = isLocalAudioUri(uri);
  const [localUri, setLocalUri] = useState<string | null>(local ? uri : null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const resolvedRef = useRef<string | null>(local ? uri : null);
  const onLoadErrorRef = useRef(onLoadError);
  onLoadErrorRef.current = onLoadError;

  useEffect(() => {
    if (isLocalAudioUri(uri)) {
      resolvedRef.current = uri;
      setLocalUri(uri);
      return;
    }
    // Ya está en disco para este mensaje: un token nuevo no obliga a bajarla otra vez.
    if (resolvedRef.current || !token) return;
    let cancelled = false;
    setFailed(false);
    localChatAudioUri(messageId, uri, token, once).then(
      (resolved) => {
        if (cancelled) return;
        resolvedRef.current = resolved;
        setLocalUri(resolved);
      },
      () => {
        if (cancelled) return;
        setFailed(true);
        onLoadErrorRef.current();
      },
    );
    return () => {
      cancelled = true;
    };
  }, [attempt, messageId, once, token, uri]);

  const source = useMemo(() => (localUri ? { uri: localUri } : null), [localUri]);
  const player = useAudioPlayer(source, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);
  const autoPlayedRef = useRef(false);
  const finishedOnceRef = useRef(false);

  useEffect(() => {
    if (!once || autoPlayedRef.current || !status.isLoaded) return;
    autoPlayedRef.current = true;
    player.play();
  }, [once, player, status.isLoaded]);

  useEffect(() => {
    if (!status.didJustFinish) return;
    if (once) {
      if (finishedOnceRef.current) return;
      finishedOnceRef.current = true;
      if (localUri) discardChatAudio(localUri);
      onOnceFinished?.();
      return;
    }
    // Vuelve al principio: la próxima pulsación la reproduce otra vez desde 0.
    player.pause();
    void player.seekTo(0).catch(() => undefined);
  }, [localUri, once, onOnceFinished, player, status.didJustFinish]);

  // La de escucha única no se queda en disco aunque se salga a mitad.
  useEffect(() => () => {
    if (once && resolvedRef.current && !isLocalAudioUri(uri)) discardChatAudio(resolvedRef.current);
  }, [once, uri]);

  const time = status.currentTime > 0 ? status.currentTime : status.duration;
  const ink = mine ? colors.text : accentPolicy.ink;
  const { muted } = bubbleInk(mine);

  if (!token && !local) return <Text style={{ color: muted, fontSize: fontSizes.sm }}>Audio no disponible.</Text>;
  if (status.error && !failed) return <Text style={{ color: muted, fontSize: fontSizes.sm }}>Este audio ya no está disponible.</Text>;

  const togglePlayback = async () => {
    if (failed) {
      // Reintenta la descarga (p. ej. tras renovar el token o recuperar la red).
      setAttempt((value) => value + 1);
      return;
    }
    if (status.playing) {
      player.pause();
      return;
    }
    if (!once && shouldRewindBeforePlay(status.currentTime, status.duration, status.didJustFinish)) {
      await player.seekTo(0).catch(() => undefined);
    }
    player.play();
  };

  const progress = status.duration > 0 ? Math.min(100, (status.currentTime / status.duration) * 100) : 0;
  const loading = !failed && !status.isLoaded;
  return (
    <View style={{ minWidth: 190, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      <PressableScale
        accessibilityLabel={failed ? 'Reintentar audio' : status.playing ? 'Pausar audio' : 'Reproducir audio'}
        disabled={loading}
        haptic="none"
        onPress={() => void togglePlayback()}
        scaleTo={0.9}
        style={{ width: minTouchTarget, height: minTouchTarget, alignItems: 'center', justifyContent: 'center' }}
      >
        {loading
          ? <ActivityIndicator color={ink} size="small" />
          : <Ionicons color={ink} name={failed ? 'refresh' : status.playing ? 'pause' : 'play'} size={iconSizes.lg} />}
      </PressableScale>
      <View style={{ flex: 1, gap: 6 }}>
        <View style={{ height: 3, overflow: 'hidden', borderRadius: radii.full, backgroundColor: chatColors.replyHint }}>
          <View style={{ width: `${progress}%`, height: 3, backgroundColor: ink }} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          {once ? <OnceBadge color={muted} /> : null}
          <Text
            accessibilityLabel={chatAudioPlayerAccessibilityLabel(status.isLoaded, status.currentTime, status.duration)}
            style={{ color: muted, fontSize: fontSizes.xs, fontVariant: ['tabular-nums'] }}
          >
            {failed
              ? 'Toca para reintentar'
              : status.isLoaded ? `${Math.floor(time / 60)}:${String(Math.floor(time % 60)).padStart(2, '0')}` : 'Nota de voz'}
          </Text>
        </View>
      </View>
    </View>
  );
});

/** El «1» dentro de un círculo con el que se marca la escucha única, como en WhatsApp. */
export function OnceBadge({ color, size = 16 }: { color: string; size?: number }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 1.5,
        borderColor: color,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color, fontSize: size * 0.6, fontWeight: semibold, lineHeight: size * 0.75 }}>1</Text>
    </View>
  );
}

function OnceLine({ color, children }: { color: string; children: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
      <OnceBadge color={color} />
      <Text style={{ color, fontSize: fontSizes.sm }}>{children}</Text>
    </View>
  );
}

function Muted({ icon, children, mine }: { icon: keyof typeof Ionicons.glyphMap; children: ReactNode; mine: boolean }) {
  const { muted } = bubbleInk(mine);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
      <Ionicons color={muted} name={icon} size={iconSizes.md} />
      <Text style={{ color: muted, fontSize: fontSizes.sm }}>{children}</Text>
    </View>
  );
}

/**
 * Lo de dentro de la burbuja según el tipo de mensaje. El texto no se pinta
 * aquí: la burbuja lo necesita para encajar la hora al final de la última línea.
 */
export function MessageMedia({
  message,
  mine,
  tombstone,
  revealed,
  token,
  onMediaError,
  onLongPress,
  onOpenImage,
  onOpenViewOnce,
  openingViewOnce,
  viewOnceConsumed = false,
  onViewOnceFinished,
}: {
  message: ChatMessage;
  mine: boolean;
  tombstone: boolean;
  revealed: RevealedMedia | undefined;
  token: string | null;
  onMediaError: () => void;
  onLongPress: () => void;
  onOpenImage: (url: string) => void;
  onOpenViewOnce: () => void;
  openingViewOnce: boolean;
  /** La nota de voz de escucha única ya sonó en esta pantalla. */
  viewOnceConsumed?: boolean;
  onViewOnceFinished?: () => void;
}) {
  const { text, muted } = bubbleInk(mine);

  if (tombstone) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
        <Ionicons color={colors.textMuted} name="ban-outline" size={iconSizes.sm} />
        <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, fontStyle: 'italic' }}>{tombstoneLabel(mine)}</Text>
      </View>
    );
  }

  if (message.type === 'audio') {
    if (message.viewOnce) {
      const revealedUrl = revealed?.mediaUrl;
      if (revealedUrl && !viewOnceConsumed) {
        return (
          <ChatAudioMessage
            messageId={message.id}
            mine={mine}
            onLoadError={onMediaError}
            onOnceFinished={onViewOnceFinished}
            once
            token={token}
            uri={revealedUrl}
          />
        );
      }
      // Quien la envía no puede escucharla (el backend lo rechaza), igual que una foto de vista única.
      if (mine) {
        return <OnceLine color={muted}>{message.viewed ? 'Nota de voz escuchada' : 'Nota de voz · escucha única'}</OnceLine>;
      }
      if (message.viewed || viewOnceConsumed) return <OnceLine color={muted}>Nota de voz escuchada</OnceLine>;
      return (
        <PressableScale
          accessibilityHint="Se reproduce una sola vez y luego deja de estar disponible"
          accessibilityLabel="Escuchar nota de voz de escucha única"
          disabled={openingViewOnce}
          haptic="none"
          onLongPress={onLongPress}
          onPress={onOpenViewOnce}
          style={{ minHeight: minTouchTarget, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
        >
          {openingViewOnce ? <ActivityIndicator color={text} size="small" /> : <OnceBadge color={text} size={20} />}
          <Text style={{ color: text, fontSize: fontSizes.sm, fontWeight: semibold }}>Toca para escuchar una vez</Text>
        </PressableScale>
      );
    }
    return message.mediaUrl
      ? <ChatAudioMessage messageId={message.id} mine={mine} onLoadError={onMediaError} token={token} uri={message.mediaUrl} />
      : <Text style={{ color: muted, fontSize: fontSizes.sm }}>Este audio ya no está disponible.</Text>;
  }

  if (message.type === 'location' && message.locationLat !== null && message.locationLng !== null) {
    return (
      <PressableScale
        haptic="none"
        onLongPress={onLongPress}
        onPress={() => void Linking.openURL(mapsUrlFor(message.locationLat as number, message.locationLng as number))}
        style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
      >
        <View style={{ width: 40, height: 40, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: chatColors.quoteFill }}>
          <Ionicons color={text} name="location" size={iconSizes.md} />
        </View>
        <View style={{ flexShrink: 1 }}>
          <Text numberOfLines={2} style={{ color: text, fontSize: fontSizes.sm, fontWeight: semibold }}>
            {message.locationLabel ?? 'Ubicación compartida'}
          </Text>
          <Text style={{ color: muted, fontSize: fontSizes.xs }}>Toca para abrir en el mapa</Text>
        </View>
      </PressableScale>
    );
  }

  if (message.type !== 'image' && message.type !== 'video') return null;
  const url = revealed?.mediaUrl ?? message.mediaUrl;
  const noun = message.type === 'image' ? 'Foto' : 'Video';

  if (message.viewOnce && message.viewed && !revealed) {
    return <Muted icon="eye-off-outline" mine={mine}>{message.type === 'image' ? 'Foto vista' : 'Video visto'}</Muted>;
  }
  if (message.viewOnce && !url) {
    // El emisor no puede abrir su propio envío de vista única (el backend lo rechaza).
    if (mine) return <Muted icon="eye-outline" mine={mine}>{`${noun} enviad${message.type === 'image' ? 'a' : 'o'} — vista única`}</Muted>;
    return (
      <PressableScale
        disabled={openingViewOnce}
        haptic="none"
        onLongPress={onLongPress}
        onPress={onOpenViewOnce}
        style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}
      >
        <Ionicons color={text} name="eye-outline" size={iconSizes.md} />
        <Text style={{ color: text, fontSize: fontSizes.sm, fontWeight: semibold }}>Toca para ver una vez</Text>
      </PressableScale>
    );
  }
  if (!url) return <Text style={{ color: muted, fontSize: fontSizes.sm }}>Contenido no disponible.</Text>;
  if (message.type === 'video') return <ChatVideo token={token} uri={url} />;

  return (
    <PressableScale accessibilityLabel="Abrir foto" haptic="none" onLongPress={onLongPress} onPress={() => onOpenImage(url)} scaleTo={0.98}>
      <Image
        cachePolicy="memory-disk"
        contentFit="cover"
        onError={onMediaError}
        priority="normal"
        recyclingKey={url}
        source={{
          uri: resolveChatMediaUrl(url),
          ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
        }}
        style={{ width: 240, height: 240, borderRadius: radii.md, backgroundColor: colors.surfaceHighest }}
      />
    </PressableScale>
  );
}
