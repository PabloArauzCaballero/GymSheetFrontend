import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { PressableScale } from '@/components/motion';
import { useReduceMotion } from '@/notifications/use-reduce-motion';
import { notify } from '@/notifications';
import { colors, fontSizes, iconSizes, radii, semibold, spacing } from '@/theme';

/** Cuánto hay que arrastrar el micrófono para cancelar (izquierda) o fijar la grabación (arriba). */
const CANCEL_DISTANCE = 110;
const LOCK_DISTANCE = 80;
/** Mantener pulsado este tiempo empieza a grabar; un toque más corto solo explica cómo se hace. */
const HOLD_TO_RECORD_MS = 180;
const ROUND_BUTTON = 44;

export type ComposerEditing = { body: string };

function formatClock(millis: number): string {
  const seconds = Math.floor(millis / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function RoundButton({
  icon,
  label,
  onPress,
  disabled,
  loading,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <PressableScale
      accessibilityLabel={label}
      disabled={disabled || loading}
      haptic="light"
      onPress={onPress}
      scaleTo={0.9}
      style={{
        width: ROUND_BUTTON,
        height: ROUND_BUTTON,
        borderRadius: radii.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.volt,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Ionicons color={colors.background} name={loading ? 'ellipsis-horizontal' : icon} size={iconSizes.md} />
    </PressableScale>
  );
}

function RecordingDot() {
  const reduceMotion = useReduceMotion();
  const opacity = useSharedValue(1);
  useEffect(() => {
    if (reduceMotion) return;
    opacity.value = withRepeat(withSequence(withTiming(0.25, { duration: 500 }), withTiming(1, { duration: 500 })), -1);
  }, [opacity, reduceMotion]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      style={[{ width: 10, height: 10, borderRadius: radii.full, backgroundColor: colors.danger }, style]}
    />
  );
}

/**
 * El redactor del chat, con la gramática de WhatsApp:
 *
 * - «+» abre el menú de adjuntos (fotos y videos, cámara, ubicación, entrenar
 *   juntos): ya no hay cinco iconos aplastando el campo de texto.
 * - El emoji vive dentro del campo; a la derecha, cámara y micrófono mientras
 *   el campo está vacío, y el botón de enviar en cuanto se escribe algo.
 * - Nota de voz: mantener pulsado el micrófono graba y soltar envía; deslizar a
 *   la izquierda cancela; deslizar hacia arriba la deja fija para grabar sin
 *   mantener el dedo, con papelera y enviar.
 */
export function ChatComposer({
  draft,
  onChangeDraft,
  onSend,
  sending,
  editing,
  onCancelEdit,
  onOpenAttach,
  onOpenCamera,
  onOpenEmoji,
  recording,
  recordingMillis,
  onVoiceStart,
  onVoiceStop,
  busy,
}: {
  draft: string;
  onChangeDraft: (value: string) => void;
  onSend: () => void;
  sending: boolean;
  editing: ComposerEditing | null;
  onCancelEdit: () => void;
  onOpenAttach: () => void;
  onOpenCamera: () => void;
  onOpenEmoji: () => void;
  recording: boolean;
  recordingMillis: number;
  onVoiceStart: () => void;
  onVoiceStop: (send: boolean) => void;
  /** Subiendo una foto, un audio o una ubicación. */
  busy: boolean;
}) {
  const [holding, setHolding] = useState(false);
  const [locked, setLocked] = useState(false);
  const cancelledRef = useRef(false);
  const lockedRef = useRef(false);
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const hasText = draft.trim().length > 0;

  // Si la grabación termina sola (límite de 2 minutos) o desde la pantalla, el
  // redactor vuelve a su estado normal.
  useEffect(() => {
    if (recording) return;
    setHolding(false);
    setLocked(false);
    lockedRef.current = false;
    dragX.value = 0;
    dragY.value = 0;
  }, [dragX, dragY, recording]);

  const stop = (send: boolean) => {
    setHolding(false);
    dragX.value = withSpring(0);
    dragY.value = withSpring(0);
    onVoiceStop(send);
  };

  const hold = Gesture.Pan()
    .runOnJS(true)
    .activateAfterLongPress(HOLD_TO_RECORD_MS)
    .enabled(!editing && !busy && !locked)
    .onStart(() => {
      cancelledRef.current = false;
      lockedRef.current = false;
      setHolding(true);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onVoiceStart();
    })
    .onUpdate((event) => {
      if (cancelledRef.current || lockedRef.current) return;
      dragX.value = Math.min(0, event.translationX);
      dragY.value = Math.min(0, event.translationY);
      if (event.translationX < -CANCEL_DISTANCE) {
        cancelledRef.current = true;
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        stop(false);
      } else if (event.translationY < -LOCK_DISTANCE) {
        lockedRef.current = true;
        setLocked(true);
        setHolding(false);
        dragX.value = withSpring(0);
        dragY.value = withSpring(0);
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    })
    .onEnd(() => {
      if (cancelledRef.current || lockedRef.current) return;
      stop(true);
    });
  const tap = Gesture.Tap()
    .runOnJS(true)
    .enabled(!editing && !busy && !locked)
    .onEnd(() => notify.info('Mantén pulsado para grabar y suelta para enviar.'));
  const micGesture = Gesture.Race(hold, tap);

  const micStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: dragX.value }, { translateY: dragY.value }, { scale: holding ? 1.25 : 1 }],
  }));
  const slideHintStyle = useAnimatedStyle(() => ({
    opacity: 1 + dragX.value / CANCEL_DISTANCE,
    transform: [{ translateX: dragX.value / 2 }],
  }));

  const pill = {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    minHeight: ROUND_BUTTON,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xs,
  };

  if (locked) {
    return (
      <Animated.View entering={FadeIn.duration(140)} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <PressableScale
          accessibilityLabel="Descartar nota de voz"
          haptic="light"
          onPress={() => stop(false)}
          scaleTo={0.9}
          style={{ width: ROUND_BUTTON, height: ROUND_BUTTON, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons color={colors.danger} name="trash-outline" size={iconSizes.md} />
        </PressableScale>
        <View style={[pill, { gap: spacing.sm, paddingHorizontal: spacing.md }]}>
          <RecordingDot />
          <Text style={{ color: colors.text, fontSize: fontSizes.md, fontVariant: ['tabular-nums'] }}>
            {formatClock(recordingMillis)}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>Grabando…</Text>
        </View>
        <RoundButton icon="send" label="Enviar nota de voz" onPress={() => stop(true)} />
      </Animated.View>
    );
  }

  return (
    <View style={{ gap: spacing.xs }}>
      {editing ? (
        <Animated.View
          entering={FadeIn.duration(140)}
          exiting={FadeOut.duration(120)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            borderLeftWidth: 3,
            borderLeftColor: colors.volt,
            borderRadius: radii.sm,
            backgroundColor: colors.surface,
            paddingVertical: spacing.xs,
            paddingHorizontal: spacing.sm,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.volt, fontSize: fontSizes.xs, fontWeight: semibold }}>Editar mensaje</Text>
            <Text numberOfLines={1} style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>
              {editing.body}
            </Text>
          </View>
          <PressableScale accessibilityLabel="Cancelar edición" haptic="none" hitSlop={spacing.sm} onPress={onCancelEdit} scaleTo={0.9}>
            <Ionicons color={colors.textMuted} name="close" size={iconSizes.md} />
          </PressableScale>
        </Animated.View>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs }}>
        {holding ? (
          <View style={[pill, { gap: spacing.sm, paddingHorizontal: spacing.md }]}>
            <RecordingDot />
            <Text style={{ color: colors.text, fontSize: fontSizes.md, fontVariant: ['tabular-nums'] }}>
              {formatClock(recordingMillis)}
            </Text>
            <Animated.View style={[{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }, slideHintStyle]}>
              <Ionicons color={colors.textMuted} name="chevron-back" size={iconSizes.sm} />
              <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>Desliza para cancelar</Text>
            </Animated.View>
          </View>
        ) : (
          <>
            {!editing ? (
              <PressableScale
                accessibilityLabel="Adjuntar"
                accessibilityHint="Fotos y videos, cámara, ubicación o entrenar juntos"
                disabled={busy}
                haptic="light"
                onPress={onOpenAttach}
                scaleTo={0.9}
                style={{ width: ROUND_BUTTON - 4, height: ROUND_BUTTON, alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons color={colors.text} name="add" size={iconSizes.lg + 4} />
              </PressableScale>
            ) : null}
            <View style={pill}>
              <PressableScale
                accessibilityLabel="Emojis"
                haptic="none"
                hitSlop={spacing.xs}
                onPress={onOpenEmoji}
                scaleTo={0.9}
                style={{ padding: spacing.xs + 2 }}
              >
                <Ionicons color={colors.textMuted} name="happy-outline" size={iconSizes.md + 2} />
              </PressableScale>
              <TextInput
                accessibilityLabel={editing ? 'Editar mensaje actual' : 'Escribe un mensaje'}
                keyboardAppearance="dark"
                multiline
                onChangeText={onChangeDraft}
                placeholder={editing ? 'Edita tu mensaje' : 'Mensaje'}
                placeholderTextColor={colors.textDisabled}
                style={{
                  flex: 1,
                  maxHeight: 120,
                  color: colors.text,
                  fontSize: fontSizes.md,
                  paddingTop: 11,
                  paddingBottom: 11,
                  paddingRight: spacing.sm,
                }}
                value={draft}
              />
            </View>
          </>
        )}
        {hasText || editing ? (
          <RoundButton
            disabled={!hasText}
            icon={editing ? 'checkmark' : 'send'}
            label={editing ? 'Guardar edición' : 'Enviar mensaje'}
            loading={sending}
            onPress={onSend}
          />
        ) : (
          <>
            {!holding ? (
              <PressableScale
                accessibilityLabel="Cámara"
                disabled={busy}
                haptic="none"
                onPress={onOpenCamera}
                scaleTo={0.9}
                style={{ width: ROUND_BUTTON - 4, height: ROUND_BUTTON, alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons color={colors.text} name="camera-outline" size={iconSizes.lg} />
              </PressableScale>
            ) : null}
            <View>
              {holding ? (
                <Animated.View
                  entering={FadeIn.duration(160)}
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    bottom: ROUND_BUTTON + spacing.md,
                    left: 2,
                    width: ROUND_BUTTON - 4,
                    paddingVertical: spacing.sm,
                    borderRadius: radii.full,
                    alignItems: 'center',
                    gap: 2,
                    backgroundColor: colors.surfaceHigh,
                  }}
                >
                  <Ionicons color={colors.textMuted} name="lock-closed-outline" size={iconSizes.sm} />
                  <Ionicons color={colors.textMuted} name="chevron-up" size={iconSizes.sm} />
                </Animated.View>
              ) : null}
              <GestureDetector gesture={micGesture}>
                <Animated.View
                  accessibilityHint="Mantén pulsado para grabar y suelta para enviar"
                  accessibilityLabel="Nota de voz"
                  accessibilityRole="button"
                  style={[
                    {
                      width: ROUND_BUTTON,
                      height: ROUND_BUTTON,
                      borderRadius: radii.full,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: colors.volt,
                      opacity: busy ? 0.5 : 1,
                    },
                    micStyle,
                  ]}
                >
                  <Ionicons color={colors.background} name={busy ? 'ellipsis-horizontal' : 'mic'} size={iconSizes.md} />
                </Animated.View>
              </GestureDetector>
            </View>
          </>
        )}
      </View>
    </View>
  );
}
