import { Ionicons } from '@expo/vector-icons';
import { forwardRef } from 'react';
import { TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn, ZoomOut } from 'react-native-reanimated';
import type { RoutineComment } from '@gymsheet/types';
import { PressableScale } from '@/components/motion';
import { PersonAvatar } from '@/components/person-avatar';
import { Text } from '@/components/text';
import { useReduceMotion } from '@/notifications/use-reduce-motion';
import { accentContrast, colors, fontSizes, iconSizes, minTouchTarget, radii, spacing } from '@/theme';

const MAX = 1000;

/**
 * El compositor, fijo abajo: tu cara, un campo en píldora «Escribe un
 * comentario…» que crece hasta cinco líneas y un botón de enviar que solo
 * aparece cuando hay algo escrito. Al responder, encima va «Respondiendo a
 * Nombre ✕».
 */
export const CommentComposer = forwardRef<
  TextInput,
  {
    me: { id: string; name: string };
    value: string;
    onChange: (text: string) => void;
    onSend: () => void;
    replyTo: RoutineComment | null;
    onCancelReply: () => void;
    sending: boolean;
  }
>(function CommentComposer({ me, value, onChange, onSend, replyTo, onCancelReply, sending }, ref) {
  const reduceMotion = useReduceMotion();
  const canSend = value.trim().length > 0 && !sending;
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
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm }}>
        <View style={{ height: minTouchTarget, justifyContent: 'center' }}>
          <PersonAvatar id={me.id} name={me.name} size={36} />
        </View>
        <View
          style={{
            flex: 1,
            minHeight: minTouchTarget,
            justifyContent: 'center',
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
            style={{ color: colors.text, fontSize: fontSizes.sm, lineHeight: 20, maxHeight: 20 * 5, padding: 0 }}
            testID="comment-input"
            value={value}
          />
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
