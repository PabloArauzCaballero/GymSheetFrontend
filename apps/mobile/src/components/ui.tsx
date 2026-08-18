import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
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
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { AmbientBackground } from '@/components/ambient';
import {
  accentContrast,
  accentGradient,
  colors,
  fontSizes,
  maxContentWidth,
  minTouchTarget,
  radii,
  spacing,
} from '@/theme';

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
    title: { color: colors.text, fontSize: fontSizes.xl, fontWeight: '700' as const },
    body: { color: colors.text, fontSize: fontSizes.md },
    muted: { color: colors.textMuted, fontSize: fontSizes.sm },
  }[variant];
  return <Text style={style}>{children}</Text>;
}

export type ButtonVariant = 'primary' | 'danger' | 'ghost';

/**
 * Fill per variant. The filled ones are gradients rather than flat colour: a
 * single hex reads as a printed rectangle, while a slight ramp across the face
 * gives it a lit edge and a body. `ghost` stays flat — it is the quiet option
 * and should not compete with the action next to it.
 */
type ButtonTone = {
  gradient: readonly [string, string] | null;
  background: string;
  ink: string;
  border: string;
};

/**
 * Relleno por variante. Es una función y no una constante porque la marca se
 * resuelve al iniciar sesión: congelarla al importar el módulo dejaría los
 * botones con los colores del gimnasio anterior.
 *
 * En la primaria, degradado y color de texto vienen de la marca. Con un acento
 * claro el texto va en negro y con uno saturado en blanco, y acertarlo es la
 * diferencia entre un botón legible y uno que no se puede leer.
 */
function buttonTone(variant: ButtonVariant): ButtonTone {
  if (variant === 'primary') {
    return {
      gradient: accentGradient(),
      background: colors.volt,
      ink: accentContrast(),
      border: colors.volt,
    };
  }
  if (variant === 'danger') {
    return {
      gradient: ['#ff8a80', '#e04f45'] as const,
      background: colors.danger,
      ink: colors.background,
      border: colors.danger,
    };
  }
  return { gradient: null, background: 'transparent', ink: colors.text, border: colors.border };
}

/**
 * Press spring for the primary action surface. Slightly livelier than the one
 * used for cards: a button is the thing the user came to hit, so it may answer
 * with more energy than a row that merely happens to be tappable. Still clamped
 * against overshoot, so it stays inside the app's Premium motion identity.
 */
const BUTTON_SPRING = { damping: 22, stiffness: 380, mass: 0.5, overshootClamping: true } as const;

/**
 * The action surface. Three things answer a touch at once — scale, a brightness
 * lift and a haptic tick — because a button that only fades reads as a picture
 * of a button. All three are compositor-level or off-thread, so none of them
 * moves the layout around it.
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
  const tone = buttonTone(variant);
  const pressed = useSharedValue(0);
  const reduceMotion = useReducedMotion();

  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: reduceMotion ? 1 : 1 - pressed.value * 0.04 }],
  }));

  // A white veil laid over the fill, not a reduction of it. Fading the gradient
  // out only reveals the darker base underneath, which reads as "disabled for a
  // moment"; adding light reads as the surface taking the charge.
  const flare = useAnimatedStyle(() => ({ opacity: pressed.value * 0.22 }));

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
      {tone.gradient && !isDisabled ? (
        <LinearGradient
          colors={tone.gradient}
          end={{ x: 1, y: 1 }}
          start={{ x: 0, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {isDisabled ? null : (
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: '#ffffff' }, flare]}
        />
      )}
      {content}
    </AnimatedPressable>
  );
}

export function Input({ label, error, ...props }: TextInputProps & { label: string; error?: string }) {
  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>{label}</Text>
      <TextInput
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
