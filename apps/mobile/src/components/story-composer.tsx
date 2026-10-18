import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StatusBar, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui';
import { STORY_CAPTION_MAX_LENGTH, STORY_CAPTION_MAX_LINES, normalizeStoryCaption } from '@/lib/story-text';
import { alpha, fontSizes, iconSizes, ink, minTouchTarget, onMedia, overlay, radii, semibold, spacing } from '@/theme';

export type StoryDraft = { uri: string; isVideo: boolean };

/** Vista previa en bucle y sin sonido: es para encuadrar, no para ver. */
function DraftVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer({ uri }, (instance) => {
    instance.muted = true;
    instance.loop = true;
    instance.play();
  });
  return (
    <VideoView
      allowsPictureInPicture={false}
      contentFit="contain"
      fullscreenOptions={{ enable: false }}
      nativeControls={false}
      player={player}
      style={{ width: '100%', height: '100%' }}
    />
  );
}

/**
 * Último paso antes de publicar: la foto o el vídeo a pantalla completa, un
 * texto opcional encima y «Compartir». Sin esta pantalla elegir del carrete
 * publicaba al instante, sin ver qué salía ni poder escribir nada.
 *
 * Se abre DESPUÉS de cerrar el selector nativo (nunca encima de él), así que no
 * hay dos presentaciones modales encadenadas.
 */
export function StoryComposer({
  draft,
  audienceLabel,
  onCancel,
  onPublish,
}: {
  draft: StoryDraft;
  /** «Todas tus conexiones» o «3 personas»: a quién llega, dicho antes de publicar. */
  audienceLabel: string;
  onCancel: () => void;
  onPublish: (caption: string | null) => void;
}) {
  const insets = useSafeAreaInsets();
  const [caption, setCaption] = useState('');
  const lines = caption.split('\n').length;

  return (
    <Modal animationType="fade" onRequestClose={onCancel} statusBarTranslucent transparent visible>
      <View style={{ flex: 1, backgroundColor: ink.black }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          {draft.isVideo ? (
            <DraftVideo uri={draft.uri} />
          ) : (
            <Image contentFit="contain" source={{ uri: draft.uri }} style={{ width: '100%', height: '100%' }} />
          )}
        </View>

        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            paddingTop: Math.max(insets.top, StatusBar.currentHeight ?? 0) + spacing.sm,
            paddingHorizontal: spacing.md,
          }}
        >
          <Pressable
            accessibilityLabel="Descartar"
            accessibilityRole="button"
            onPress={onCancel}
            style={({ pressed }) => ({
              width: minTouchTarget,
              height: minTouchTarget,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: radii.full,
              backgroundColor: overlay.scrimFaint,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Ionicons color={ink.white} name="close" size={iconSizes.lg} />
          </Pressable>
          <View style={{ flex: 1 }} />
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.xs,
              paddingHorizontal: spacing.md,
              minHeight: 32,
              borderRadius: radii.full,
              backgroundColor: overlay.scrimFaint,
            }}
          >
            <Ionicons color={onMedia.textSoft} name="people-outline" size={iconSizes.sm} />
            <Text style={{ color: onMedia.textSoft, fontSize: fontSizes.xs, fontWeight: semibold }}>{audienceLabel}</Text>
          </View>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}
        >
          <View style={{ gap: spacing.md, paddingHorizontal: spacing.md, paddingBottom: insets.bottom + spacing.md }}>
            <TextInput
              accessibilityHint={`Opcional. Hasta ${STORY_CAPTION_MAX_LENGTH} caracteres.`}
              accessibilityLabel="Texto de la story"
              maxLength={STORY_CAPTION_MAX_LENGTH}
              multiline
              onChangeText={(value) => {
                // Las líneas de más no se escriben: el texto taparía la foto.
                if (value.split('\n').length <= STORY_CAPTION_MAX_LINES) setCaption(value);
              }}
              placeholder="Añade un texto…"
              placeholderTextColor={onMedia.textMuted}
              style={{
                minHeight: minTouchTarget,
                maxHeight: 132,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                borderRadius: radii.lg,
                backgroundColor: overlay.scrimSoft,
                color: ink.white,
                fontSize: fontSizes.md,
                fontWeight: semibold,
                textAlign: 'center',
              }}
              value={caption}
            />
            {caption.length > STORY_CAPTION_MAX_LENGTH - 40 || lines === STORY_CAPTION_MAX_LINES ? (
              <Text style={{ color: alpha(ink.white, 0.75), fontSize: fontSizes.xs, textAlign: 'center' }}>
                {caption.length}/{STORY_CAPTION_MAX_LENGTH}
              </Text>
            ) : null}
            <Button
              icon="arrow-up-circle-outline"
              label="Compartir"
              onPress={() => onPublish(normalizeStoryCaption(caption))}
            />
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
