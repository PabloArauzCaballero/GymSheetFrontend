import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Image } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
import { memo, useEffect, useMemo, type ReactNode } from 'react';
import { Linking, Text, View } from 'react-native';
import type { ChatMessage } from '@gymsheet/schemas';
import { PressableScale } from '@/components/motion';
import { env } from '@/config/env';
import { tombstoneLabel } from '@/hooks/chat-message-actions';
import { chatAudioPlayerAccessibilityLabel, chatAudioPlayerSource } from '@/lib/chat-audio';
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

const ChatAudioMessage = memo(function ChatAudioMessage({ uri, token, mine, onLoadError }: {
  uri: string;
  token: string | null;
  mine: boolean;
  /** No cargó: casi siempre el token de 15 min venció; la pantalla lo renueva y el reproductor se rehace. */
  onLoadError: () => void;
}) {
  const source = useMemo(() => (token ? chatAudioPlayerSource(uri, env.apiUrl, token) : null), [token, uri]);
  const player = useAudioPlayer(source, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);
  const unavailable = Boolean(status.error);
  useEffect(() => {
    if (status.error) onLoadError();
  }, [onLoadError, status.error]);
  const time = status.currentTime > 0 ? status.currentTime : status.duration;
  const ink = mine ? colors.text : accentPolicy.ink;
  const { muted } = bubbleInk(mine);

  if (!token) return <Text style={{ color: muted, fontSize: fontSizes.sm }}>Audio no disponible.</Text>;
  if (unavailable) return <Text style={{ color: muted, fontSize: fontSizes.sm }}>Este audio ya no está disponible.</Text>;

  const progress = status.duration > 0 ? Math.min(100, (status.currentTime / status.duration) * 100) : 0;
  return (
    <View style={{ minWidth: 190, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      <PressableScale
        accessibilityLabel={status.playing ? 'Pausar audio' : 'Reproducir audio'}
        disabled={!status.isLoaded}
        haptic="none"
        onPress={() => (status.playing ? player.pause() : player.play())}
        scaleTo={0.9}
        style={{ width: minTouchTarget, height: minTouchTarget, alignItems: 'center', justifyContent: 'center' }}
      >
        <Ionicons color={ink} name={status.playing ? 'pause' : 'play'} size={iconSizes.lg} />
      </PressableScale>
      <View style={{ flex: 1, gap: 6 }}>
        <View style={{ height: 3, overflow: 'hidden', borderRadius: radii.full, backgroundColor: chatColors.replyHint }}>
          <View style={{ width: `${progress}%`, height: 3, backgroundColor: ink }} />
        </View>
        <Text
          accessibilityLabel={chatAudioPlayerAccessibilityLabel(status.isLoaded, status.currentTime, status.duration)}
          style={{ color: muted, fontSize: fontSizes.xs, fontVariant: ['tabular-nums'] }}
        >
          {status.isLoaded ? `${Math.floor(time / 60)}:${String(Math.floor(time % 60)).padStart(2, '0')}` : 'Nota de voz'}
        </Text>
      </View>
    </View>
  );
});

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
    return message.mediaUrl
      ? <ChatAudioMessage mine={mine} onLoadError={onMediaError} token={token} uri={message.mediaUrl} />
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
