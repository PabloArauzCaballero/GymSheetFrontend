import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { AmbientBackground } from '@/components/ambient';
import { colors, fontSizes, maxContentWidth, minTouchTarget, radii, spacing } from '@/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Full-screen container that respects the safe area and applies the base background. */
export function Screen({ children }: { children: ReactNode }) {
  const { width } = useWindowDimensions();
  // The auth forms are short. Left at full width and pinned to the top they
  // occupy the first third of a tablet and leave the rest black, so the column
  // is capped and the whole block is centred.
  const gutter = Math.max(spacing.lg, (width - maxContentWidth) / 2);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* The auth screens used to be the only ones without it, which made the
          very first screen of the app the flattest one — plain black behind a
          form, while every screen after it was lit. */}
      <AmbientBackground />
      {/* The form is vertically centred, so on iOS the keyboard opens straight
          over the password field and the «Iniciar sesión» button — the two things
          the screen exists for. Android resizes the window itself
          (`adjustResize`), which is why `behavior` is left undefined there:
          setting it would make the layout jump twice for one keyboard. */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            paddingHorizontal: gutter,
            paddingVertical: spacing.lg,
            gap: spacing.md,
          }}
        >
          {children}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function AppText({
  children,
  variant = 'body',
}: {
  children: ReactNode;
  variant?: 'title' | 'body' | 'muted';
}) {
  const style = {
    // Misma regla que `ScreenHeader`: cuanto mayor el tamaño, menor el peso.
    title: { color: colors.text, fontSize: fontSizes.xl, fontWeight: '600' as const },
    body: { color: colors.text, fontSize: fontSizes.md },
    muted: { color: colors.textMuted, fontSize: fontSizes.sm },
  }[variant];
  return <Text style={style}>{children}</Text>;
}

export type ButtonVariant = 'primary' | 'danger' | 'ghost';

/**
 * Fill per variant — un color plano por variante, sin degradados.
 *
 * Antes cada botón lleno era un degradado de dos paradas con un velo blanco
 * animado encima. Tres capas para pintar un rectángulo. El degradado no se
 * leía como volumen sino como una superficie sucia, porque la rampa iba de un
 * volt más claro que la marca a uno más apagado: el color del botón principal
 * no era el color de la marca en ningún punto de su cara.
 *
 * Un relleno plano en el volt exacto es más limpio, se lee mejor sobre negro y
 * es lo que hace un botón nativo. La respuesta al toque la sigue dando la
 * escala, que es háptica y no decorativa.
 */
const BUTTON_TONE: Record<
  ButtonVariant,
  { background: string; ink: string; border: string }
> = {
  primary: { background: colors.volt, ink: colors.background, border: colors.volt },
  danger: { background: colors.danger, ink: colors.background, border: colors.danger },
  ghost: { background: 'transparent', ink: colors.text, border: colors.border },
};

/**
 * Press spring for the primary action surface. Slightly livelier than the one
 * used for cards: a button is the thing the user came to hit, so it may answer
 * with more energy than a row that merely happens to be tappable. Still clamped
 * against overshoot, so it stays inside the app's Premium motion identity.
 */
const BUTTON_SPRING = { damping: 22, stiffness: 380, mass: 0.5, overshootClamping: true } as const;

/**
 * The action surface. Dos cosas responden al toque: la escala y un tic háptico.
 * Ambas son de compositor o fuera del hilo de JS, así que ninguna mueve el
 * layout de alrededor.
 */
export function Button({
  label,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  style,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: ButtonVariant;
  style?: StyleProp<ViewStyle>;
}) {
  const isDisabled = disabled || loading;
  const tone = BUTTON_TONE[variant];
  const pressed = useSharedValue(0);
  const reduceMotion = useReducedMotion();

  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: reduceMotion ? 1 : 1 - pressed.value * 0.04 }],
  }));

  const content = loading ? (
    <ActivityIndicator color={tone.ink} />
  ) : (
    <Text
      style={{
        color: isDisabled ? colors.textDisabled : tone.ink,
        fontSize: fontSizes.md,
        fontWeight: '700',
        letterSpacing: 0.2,
      }}
    >
      {label}
    </Text>
  );

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      onPressIn={() => {
        if (isDisabled) return;
        pressed.value = withSpring(1, BUTTON_SPRING);
        // Fired on contact, not on release: the phone should answer the finger
        // at the moment of touch, not after the action resolves.
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }}
      onPressOut={() => {
        pressed.value = withSpring(0, BUTTON_SPRING);
      }}
      style={[
        {
          minHeight: minTouchTarget,
          borderRadius: radii.md,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: isDisabled ? colors.surfaceHigh : tone.border,
          backgroundColor: isDisabled ? colors.surfaceHigh : tone.background,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: spacing.lg,
        },
        animated,
        style,
      ]}
    >
      {content}
    </AnimatedPressable>
  );
}

export function Input({ label, error, ...props }: TextInputProps & { label: string; error?: string }) {
  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>{label}</Text>
      <TextInput
        // iOS draws a light keyboard by default; against a black screen the
        // slab of white is the brightest thing in the app. Android ignores it.
        keyboardAppearance="dark"
        placeholderTextColor={colors.textDisabled}
        style={{
          minHeight: minTouchTarget,
          borderRadius: radii.md,
          borderWidth: 1,
          borderColor: error ? colors.danger : colors.border,
          backgroundColor: colors.surface,
          color: colors.text,
          paddingHorizontal: spacing.md,
          fontSize: fontSizes.md,
        }}
        {...props}
      />
      {error ? <Text style={{ color: colors.danger, fontSize: fontSizes.xs }}>{error}</Text> : null}
    </View>
  );
}
