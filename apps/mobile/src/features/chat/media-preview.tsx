import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PressableScale } from '@/components/motion';
import { colors, fontSizes, iconSizes, overlay, radii, semibold, spacing } from '@/theme';

export type PickedMedia = { uri: string; name: string; mimeType: string; kind: 'image' | 'video' };

function PreviewVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer({ uri }, (videoPlayer) => {
    videoPlayer.loop = true;
    videoPlayer.play();
  });
  return <VideoView contentFit="contain" nativeControls player={player} style={{ flex: 1 }} />;
}

/**
 * Lo que WhatsApp enseña antes de mandar una foto: la foto a pantalla
 * completa, un comentario opcional y el «1» de vista única junto al botón de
 * enviar. Antes la foto salía sin verla, y la vista única era un ojo suelto en
 * el redactor que había que acordarse de activar antes de elegirla.
 */
export function MediaPreview({
  media,
  sending,
  onCancel,
  onSend,
}: {
  media: PickedMedia | null;
  sending: boolean;
  onCancel: () => void;
  onSend: (options: { caption: string; viewOnce: boolean }) => void;
}) {
  const insets = useSafeAreaInsets();
  const [caption, setCaption] = useState('');
  const [viewOnce, setViewOnce] = useState(false);
  useEffect(() => {
    setCaption('');
    setViewOnce(false);
  }, [media?.uri]);

  return (
    <Modal animationType="slide" onRequestClose={onCancel} visible={Boolean(media)}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, backgroundColor: overlay.scrimSolid, paddingTop: insets.top, paddingBottom: insets.bottom + spacing.sm }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm }}>
          <PressableScale
            accessibilityLabel="Cancelar"
            disabled={sending}
            haptic="none"
            hitSlop={spacing.sm}
            onPress={onCancel}
            scaleTo={0.9}
            style={{ width: 40, height: 40, borderRadius: radii.full, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceHigh }}
          >
            <Ionicons color={colors.text} name="close" size={iconSizes.md} />
          </PressableScale>
        </View>
        <View style={{ flex: 1 }}>
          {media?.kind === 'video' ? (
            <PreviewVideo uri={media.uri} />
          ) : media ? (
            <Image contentFit="contain" source={{ uri: media.uri }} style={{ flex: 1 }} />
          ) : null}
        </View>
        {viewOnce ? (
          <Text style={{ color: colors.text, fontSize: fontSizes.xs, textAlign: 'center', paddingVertical: spacing.xs }}>
            {media?.kind === 'video' ? 'El video' : 'La foto'} se podrá ver una sola vez.
          </Text>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, paddingHorizontal: spacing.md, paddingTop: spacing.sm }}>
          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              minHeight: 44,
              borderRadius: radii.xl,
              backgroundColor: colors.surface,
              paddingLeft: spacing.md,
              paddingRight: spacing.xs,
            }}
          >
            <TextInput
              accessibilityLabel="Añadir un comentario"
              keyboardAppearance="dark"
              maxLength={2000}
              multiline
              onChangeText={setCaption}
              placeholder="Añade un comentario…"
              placeholderTextColor={colors.textDisabled}
              style={{ flex: 1, maxHeight: 100, color: colors.text, fontSize: fontSizes.md, paddingVertical: 10 }}
              value={caption}
            />
            <PressableScale
              accessibilityLabel="Vista única"
              accessibilityState={{ selected: viewOnce }}
              haptic="selection"
              hitSlop={spacing.xs}
              onPress={() => setViewOnce((current) => !current)}
              scaleTo={0.9}
              style={{
                width: 32,
                height: 32,
                borderRadius: radii.full,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1.5,
                borderColor: viewOnce ? colors.volt : colors.textMuted,
                backgroundColor: viewOnce ? colors.volt : 'transparent',
              }}
              testID="chat-preview-view-once"
            >
              <Text style={{ color: viewOnce ? colors.background : colors.textMuted, fontSize: fontSizes.sm, fontWeight: semibold }}>1</Text>
            </PressableScale>
          </View>
          <PressableScale
            accessibilityLabel={media?.kind === 'video' ? 'Enviar video' : 'Enviar foto'}
            disabled={sending}
            haptic="light"
            onPress={() => onSend({ caption: caption.trim(), viewOnce })}
            scaleTo={0.9}
            style={{
              width: 44,
              height: 44,
              borderRadius: radii.full,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.volt,
              opacity: sending ? 0.6 : 1,
            }}
            testID="chat-preview-send"
          >
            <Ionicons color={colors.background} name={sending ? 'ellipsis-horizontal' : 'send'} size={iconSizes.md} />
          </PressableScale>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
