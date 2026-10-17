import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Linking, View } from 'react-native';
import type { CommentAttachment } from '@gymsheet/types';
import { PressableScale } from '@/components/motion';
import { Text } from '@/components/text';
import { sizeLabel } from '@/features/routine-community/attachments';
import { colors, iconSizes, radii, spacing } from '@/theme';

const MAX_WIDTH = 240;
const MAX_HEIGHT = 300;

/** Mide el adjunto respetando su proporción dentro de una caja máxima. */
function fit(attachment: CommentAttachment, fallback: number) {
  const w = attachment.ancho && attachment.ancho > 0 ? attachment.ancho : fallback;
  const h = attachment.alto && attachment.alto > 0 ? attachment.alto : fallback;
  const scale = Math.min(MAX_WIDTH / w, MAX_HEIGHT / h, 1.6);
  return { width: Math.round(w * scale), height: Math.round(h * scale) };
}

function CommentVideo({ attachment }: { attachment: CommentAttachment }) {
  const player = useVideoPlayer({ uri: attachment.url }, (instance) => {
    instance.loop = false;
    instance.muted = false;
  });
  const size = fit(attachment, 240);
  return (
    <VideoView
      contentFit="cover"
      nativeControls
      player={player}
      style={{ ...size, borderRadius: radii.md, backgroundColor: colors.surfaceHighest }}
    />
  );
}

/** El adjunto de un comentario: GIF, sticker, foto, video o archivo. */
export function AttachmentView({ attachment }: { attachment: CommentAttachment }) {
  if (attachment.tipo === 'STICKER') {
    return (
      <Image
        accessibilityLabel={attachment.nombre ?? 'Sticker'}
        contentFit="contain"
        source={{ uri: attachment.url }}
        style={{ ...fit(attachment, 160), maxWidth: 180 }}
      />
    );
  }
  if (attachment.tipo === 'GIF' || attachment.tipo === 'IMAGEN') {
    return (
      <Image
        accessibilityLabel={attachment.nombre ?? (attachment.tipo === 'GIF' ? 'GIF' : 'Foto')}
        cachePolicy="memory-disk"
        contentFit="cover"
        source={{ uri: attachment.url }}
        style={{
          ...fit(attachment, 200),
          borderRadius: radii.md,
          backgroundColor: colors.surfaceHighest,
        }}
        transition={160}
      />
    );
  }
  if (attachment.tipo === 'VIDEO') return <CommentVideo attachment={attachment} />;
  return (
    <PressableScale
      accessibilityLabel={`Abrir archivo ${attachment.nombre ?? ''}`}
      haptic="selection"
      onPress={() => void Linking.openURL(attachment.url)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        padding: spacing.sm,
        maxWidth: MAX_WIDTH,
        borderRadius: radii.md,
        borderCurve: 'continuous',
        backgroundColor: colors.surfaceHighest,
      }}
    >
      <Ionicons color={colors.volt} name="document-text" size={iconSizes.lg} />
      <View style={{ flexShrink: 1 }}>
        <Text numberOfLines={1} strong variant="footnote">
          {attachment.nombre ?? 'Archivo'}
        </Text>
        <Text tone="muted" variant="caption">
          {sizeLabel(attachment.bytes) || 'Toca para abrir'}
        </Text>
      </View>
    </PressableScale>
  );
}
