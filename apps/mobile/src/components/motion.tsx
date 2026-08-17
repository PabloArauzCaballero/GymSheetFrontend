import type { ReactNode } from 'react';
import { Pressable, type StyleProp, type ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Motion identity for the app — one archetype applied everywhere: **Premium**.
 * Calm and deliberate, never bouncy. Three constants, per the motion-design
 * brand-identity rule:
 *
 * 1. Signature curve: `(0.4, 0, 0.2, 1)` — used by ~80% of transitions.
 * 2. Duration palette: quick / standard / slow.
 * 3. Entrance pattern: rise 16px + fade, decelerating.
 *
 * Exits are deliberately shorter than entrances: users care about what arrives,
 * and a slow dismissal reads as lag.
 */
export const PREMIUM_EASING = Easing.bezier(0.4, 0, 0.2, 1);

export const DURATION = {
  /** Press feedback — must feel instant. */
  quick: 140,
  /** Cards and panels arriving. */
  standard: 280,
  /** Screen-level context switches. */
  slow: 420,
  /** Leaving is faster than arriving. */
  exit: 180,
} as const;

/**
 * Press spring tuned for **zero visible overshoot**: the Premium archetype
 * settles, it does not bounce. High damping plus low mass keeps it responsive
 * without wobble.
 */
const PRESS_SPRING = { damping: 26, stiffness: 340, mass: 0.5, overshootClamping: true } as const;

/** Micro-cascade delay; capped so the last row never waits on a queue. */
const STAGGER_MS = 40;
const MAX_STAGGERED = 6;

/**
 * Tactile surface. Scale plus a slight dim: two properties, "polished" on the
 * simplicity scale, and neither one touches layout so nothing around it shifts.
 */
export function PressableScale({
  children,
  onPress,
  disabled = false,
  accessibilityLabel,
  style,
}: {
  children: ReactNode;
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const pressed = useSharedValue(0);
  const reduceMotion = useReducedMotion();

  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: reduceMotion ? 1 : 1 - pressed.value * 0.03 }],
    opacity: 1 - pressed.value * 0.12,
  }));

  return (
    <AnimatedPressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => {
        pressed.value = withSpring(1, PRESS_SPRING);
        // A light tick on contact. Fired on press-in, not on press-out, so the
        // phone answers the finger at the moment of touch rather than after the
        // action resolves — that delay is what reads as an unresponsive app.
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }}
      onPressOut={() => {
        // Release settles a touch slower than the press — follow-through.
        pressed.value = withTiming(0, { duration: DURATION.quick, easing: PREMIUM_EASING });
      }}
      style={[animated, style]}
    >
      {children}
    </AnimatedPressable>
  );
}

/**
 * Entrance for stacked content: rise + fade, decelerating, staggered in reading
 * order so the eye is led down the screen exactly once.
 */
export function EnterUp({
  children,
  index = 0,
  style,
}: {
  children: ReactNode;
  index?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const reduceMotion = useReducedMotion();
  const delay = Math.min(index, MAX_STAGGERED) * STAGGER_MS;

  return (
    <Animated.View
      entering={
        reduceMotion
          ? // Reduced motion still needs the element to appear, just without travel.
            FadeIn.duration(1)
          : FadeInDown.duration(DURATION.standard)
              .easing(PREMIUM_EASING)
              .withInitialValues({ transform: [{ translateY: 16 }] })
              .delay(delay)
      }
      style={style}
    >
      {children}
    </Animated.View>
  );
}
