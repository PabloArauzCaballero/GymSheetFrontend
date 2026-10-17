import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Linking, View } from 'react-native';
import type { MusicPlaylist } from '@gymsheet/schemas';
import { PressableScale } from '@/components/motion';
import { Shimmer } from '@/components/shimmer';
import { Text } from '@/components/text';
import { notify } from '@/notifications';
import { alpha, colors, iconSizes, ink, muscleGradients, radii, spacing } from '@/theme';
import { MUSIC_KIND_LABEL } from '@/features/music/use-music';
import { MediaChip } from '@/features/routine-catalog/media-chip';

/** Abre el enlace: con Spotify instalado lo abre la app (enlace universal); si no, el navegador. */
export async function openInSpotify(url: string) {
  try {
    await Linking.openURL(url);
  } catch {
    notify.error(new Error('No pudimos abrir Spotify. Revisa el enlace.'));
  }
}

/** Portada cuadrada: la de Spotify, con la franja de luz mientras llega; sin ella, notas sobre degradado. */
export function PlaylistCover({ playlist, size }: { playlist: MusicPlaylist; size: number }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [from, to] = muscleGradients[playlist.titulo.length % muscleGradients.length] ?? muscleGradients[0]!;
  const showImage = Boolean(playlist.imagenUrl) && !failed;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radii.lg,
        borderCurve: 'continuous',
        overflow: 'hidden',
        backgroundColor: colors.surfaceHigh,
      }}
    >
      {showImage ? (
        <Image
          accessibilityIgnoresInvertColors
          cachePolicy="memory-disk"
          contentFit="cover"
          onError={() => setFailed(true)}
          onLoad={() => setLoaded(true)}
          recyclingKey={playlist.id}
          source={{ uri: playlist.imagenUrl ?? undefined }}
          style={{ width: '100%', height: '100%' }}
          transition={180}
        />
      ) : (
        <LinearGradient
          colors={[from, to]}
          end={{ x: 1, y: 1 }}
          start={{ x: 0, y: 0 }}
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons color={alpha(ink.white, 0.85)} name="musical-notes" size={Math.round(size * 0.36)} />
        </LinearGradient>
      )}
      {showImage && !loaded ? <Shimmer /> : null}
    </View>
  );
}

/**
 * Tarjeta de la cuadrícula: portada, título y de quién es. Tocar abre Spotify;
 * «…» si es tuya. Una privada lo dice con «Solo tú», como las rutinas.
 */
export function PlaylistCard({
  playlist,
  width,
  onManage,
}: {
  playlist: MusicPlaylist;
  width: number;
  onManage?: () => void;
}) {
  const who = playlist.esMia ? 'Tú' : playlist.autor.displayName;
  return (
    <PressableScale
      accessibilityHint="Abre en Spotify"
      accessibilityLabel={`${playlist.titulo}. ${MUSIC_KIND_LABEL[playlist.tipo]} de ${who}${playlist.visibilidad === 'PRIVATE' ? '. Solo tú la ves' : ''}`}
      onPress={() => void openInSpotify(playlist.url)}
      scaleTo={0.97}
      style={{ width, gap: spacing.sm }}
      testID={`playlist-${playlist.id}`}
    >
      <View>
        <PlaylistCover playlist={playlist} size={width} />
        {playlist.visibilidad === 'PRIVATE' ? (
          <View style={{ position: 'absolute', left: spacing.sm, bottom: spacing.sm }}>
            <MediaChip icon="lock-closed" label="Solo tú" />
          </View>
        ) : null}
        {playlist.esMia && onManage ? (
          <PressableScale
            accessibilityLabel={`Opciones de ${playlist.titulo}`}
            haptic="selection"
            hitSlop={8}
            onPress={onManage}
            scaleTo={0.9}
            style={{
              position: 'absolute',
              top: spacing.xs,
              right: spacing.xs,
              width: 32,
              height: 32,
              borderRadius: radii.full,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: alpha(ink.black, 0.55),
            }}
            testID={`playlist-manage-${playlist.id}`}
          >
            <Ionicons color={ink.white} name="ellipsis-horizontal" size={iconSizes.sm} />
          </PressableScale>
        ) : null}
      </View>
      <View style={{ gap: spacing.xxs }}>
        <Text numberOfLines={2} strong variant="subhead">
          {playlist.titulo}
        </Text>
        <Text numberOfLines={1} tone="muted" variant="footnote">
          {`${MUSIC_KIND_LABEL[playlist.tipo]} · ${who}`}
        </Text>
      </View>
    </PressableScale>
  );
}

/** Esqueleto con la forma de la tarjeta. */
export function PlaylistCardSkeleton({ width }: { width: number }) {
  return (
    <View style={{ width, gap: spacing.sm }}>
      <View style={{ width, height: width, borderRadius: radii.lg, overflow: 'hidden', backgroundColor: colors.surfaceHigh }}>
        <Shimmer />
      </View>
      <View style={{ height: 14, width: '80%', borderRadius: radii.sm, backgroundColor: colors.surfaceHigh }} />
      <View style={{ height: 12, width: '50%', borderRadius: radii.sm, backgroundColor: colors.surfaceHigh }} />
    </View>
  );
}
