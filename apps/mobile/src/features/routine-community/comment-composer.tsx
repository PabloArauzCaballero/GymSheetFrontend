import { Ionicons } from '@expo/vector-icons';
import { forwardRef } from 'react';
import { TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn, ZoomOut } from 'react-native-reanimated';
import type { RoutineComment } from '@gymsheet/types';
import { PressableScale } from '@/components/motion';
import { Image } from 'expo-image';
import { previewOf, sizeLabel, type PendingAttachment } from '@/features/routine-community/attachments';
import { Text } from '@/components/text';
import { useReduceMotion } from '@/notifications/use-reduce-motion';
import { accentContrast, colors, fontSizes, iconSizes, minTouchTarget, radii, spacing } from '@/theme';

const MAX = 1000;

/** Vista previa pequeña de lo que se va a enviar. Un video o un archivo no se reproduce aquí. */
function AttachmentPreview({ attachment }: { attachment: PendingAttachment }) {
  const preview = previewOf(attachment);
  if (preview.tipo === 'ARCHIVO' || preview.tipo === 'VIDEO') {
    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          height: 64,
          paddingHorizontal: spacing.md,
          borderRadius: radii.md,
          backgroundColor: colors.surfaceHigh,
        }}
      >
        <Ionicons color={colors.volt} name={preview.tipo === 'VIDEO' ? 'videocam' : 'document-text'} size={iconSizes.lg} />
        <View style={{ maxWidth: 200 }}>
          <Text numberOfLines={1} strong variant="footnote">
            {preview.nombre ?? (preview.tipo === 'VIDEO' ? 'Video' : 'Archivo')}
          </Text>
          <Text tone="muted" variant="caption">
            {sizeLabel(preview.bytes) || (preview.tipo === 'VIDEO' ? 'Video' : 'Archivo')}
          </Text>
        </View>
      </View>
    );
  }
  return (
    <Image
      contentFit={preview.tipo === 'STICKER' ? 'contain' : 'cover'}
      source={{ uri: preview.url }}
      style={{ width: 96, height: 96, borderRadius: radii.md, backgroundColor: colors.surfaceHigh }}
    />
  );
}

/**
 * El compositor, fijo abajo: tu cara, un campo en píldora «Escribe un
 * comentario…» que crece hasta cinco líneas y un botón de enviar que solo
 * aparece cuando hay algo escrito. Al responder, encima va «Respondiendo a
 * Nombre ✕».
 */
export const CommentComposer = forwardRef<
  TextInput,
  {
    value: string;
    onChange: (text: string) => void;
    onSend: () => void;
    replyTo: RoutineComment | null;
    onCancelReply: () => void;
    sending: boolean;
    attachment: PendingAttachment | null;
    onClearAttachment: () => void;
    onAdd: () => void;
    onEmoji: () => void;
  }
>(function CommentComposer(
  { value, onChange, onSend, replyTo, onCancelReply, sending, attachment, onClearAttachment, onAdd, onEmoji },
  ref,
) {
  const reduceMotion = useReduceMotion();
  const canSend = (value.trim().length > 0 || attachment !== null) && !sending;
  return (
    <View style={{ gap: spacing.sm }}>
      {replyTo ? (
        <Animated.View
          entering={reduceMotion ? undefined : FadeIn.duration(160)}
          exiting={reduceMotion ? undefined : FadeOut.duration(120)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingLeft: spacing.xs }}
        >
          <Text numberOfLines={1} style={{ flex: 1 }} tone="muted" variant="footnote">
            Respondiendo a{' '}
            <Text strong tone="secondary" variant="footnote">
              {replyTo.autor.nombre}
            </Text>
          </Text>
          <PressableScale
            accessibilityLabel="Dejar de responder"
            haptic="none"
            hitSlop={12}
            onPress={onCancelReply}
            scaleTo={0.9}
            testID="cancel-reply"
          >
            <Ionicons color={colors.textMuted} name="close-circle" size={iconSizes.md} />
          </PressableScale>
        </Animated.View>
      ) : null}
      {attachment ? (
        <Animated.View
          entering={reduceMotion ? undefined : FadeIn.duration(160)}
          exiting={reduceMotion ? undefined : FadeOut.duration(120)}
          style={{ alignSelf: 'flex-start', paddingLeft: spacing.xs }}
        >
          <View>
            <AttachmentPreview attachment={attachment} />
            <PressableScale
              accessibilityLabel="Quitar adjunto"
              haptic="none"
              hitSlop={10}
              onPress={onClearAttachment}
              scaleTo={0.9}
              style={{ position: 'absolute', top: -8, right: -8 }}
              testID="clear-attachment"
            >
              <Ionicons color={colors.text} name="close-circle" size={iconSizes.lg} />
            </PressableScale>
          </View>
        </Animated.View>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm }}>
        <PressableScale
          accessibilityLabel="Adjuntar foto, video o archivo"
          haptic="light"
          onPress={onAdd}
          scaleTo={0.9}
          style={{
            width: minTouchTarget,
            height: minTouchTarget,
            borderRadius: radii.full,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.surfaceHigh,
          }}
          testID="comment-attach"
        >
          <Ionicons color={colors.textSecondary} name="add" size={iconSizes.lg} />
        </PressableScale>
        <View
          style={{
            flex: 1,
            minHeight: minTouchTarget,
            flexDirection: 'row',
            alignItems: 'flex-end',
            gap: spacing.sm,
            borderRadius: 22,
            borderCurve: 'continuous',
            backgroundColor: colors.surfaceHigh,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
          }}
        >
          <TextInput
            accessibilityLabel={replyTo ? `Responder a ${replyTo.autor.nombre}` : 'Escribe un comentario'}
            cursorColor={colors.volt}
            keyboardAppearance="dark"
            maxLength={MAX}
            multiline
            onChangeText={onChange}
            placeholder={replyTo ? 'Escribe una respuesta…' : 'Escribe un comentario…'}
            placeholderTextColor={colors.textMuted}
            ref={ref}
            selectionColor={colors.volt}
            style={{ flex: 1, color: colors.text, fontSize: fontSizes.sm, lineHeight: 20, maxHeight: 20 * 5, padding: 0 }}
            testID="comment-input"
            value={value}
          />
          <PressableScale
            accessibilityLabel="Emojis, GIFs y stickers"
            haptic="light"
            hitSlop={8}
            onPress={onEmoji}
            scaleTo={0.88}
            testID="comment-emoji"
          >
            <Ionicons color={colors.textSecondary} name="happy-outline" size={iconSizes.lg} />
          </PressableScale>
        </View>
        {canSend || sending ? (
          <Animated.View
            entering={reduceMotion ? undefined : ZoomIn.duration(160)}
            exiting={reduceMotion ? undefined : ZoomOut.duration(120)}
          >
            <PressableScale
              accessibilityLabel={replyTo ? 'Enviar respuesta' : 'Enviar comentario'}
              disabled={!canSend}
              haptic="light"
              onPress={onSend}
              scaleTo={0.9}
              style={{
                width: minTouchTarget,
                height: minTouchTarget,
                borderRadius: radii.full,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.volt,
                opacity: canSend ? 1 : 0.5,
              }}
              testID="send-comment"
            >
              <Ionicons color={accentContrast()} name="arrow-up" size={iconSizes.md + 2} />
            </PressableScale>
          </Animated.View>
        ) : null}
      </View>
    </View>
  );
});
