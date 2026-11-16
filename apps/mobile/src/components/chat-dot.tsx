import { chatDotFigure } from '@gymsheet/domain';
import { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { DURATION, PREMIUM_EASING } from '@/components/motion';
import { Text } from '@/components/text';
import { useReduceMotion } from '@/notifications/use-reduce-motion';
import { chat, colors, fontSizes, radii } from '@/theme';

const PULSES = 2;

/**
 * Chat's glowing dot. A halo of the surface under it (`halo`) keeps it ≥3:1
 * wherever it sits, the glow is a coloured shadow, and it pulses only when
 * `pulseKey` changes (something new arrived): two rings, then still. With
 * Reduce Motion it never pulses. `count` > 0 prints the figure; without it the
 * dot is a plain marker. Decorative to assistive tech: the control that owns it
 * carries the words (`chatWaitingLabel`).
 */
export function ChatDot({ count, halo = colors.surface, pulseKey = 0, style, tone = 'alert' }: { count?: number; halo?: string; pulseKey?: number; style?: StyleProp<ViewStyle>; tone?: 'alert' | 'spark' }) {
  // `spark` is decoration (the deck button's glowing tip): Chat ink, never a figure, never the alert pink.
  const spark = tone === 'spark';
  const reduceMotion = useReduceMotion();
  const ring = useSharedValue(0);
  const figure = !spark && count && count > 0 ? chatDotFigure(count) : null;
  const size = figure ? 18 : 8;

  useEffect(() => {
    if (!pulseKey || reduceMotion || spark) return;
    ring.value = 0;
    const once = withSequence(withTiming(1, { duration: DURATION.slow * 2, easing: PREMIUM_EASING }), withTiming(0, { duration: 0 }));
    ring.value = withDelay(DURATION.quick, withRepeat(once, PULSES, false));
    return () => cancelAnimation(ring);
  }, [pulseKey, reduceMotion, ring]);

  const ringStyle = useAnimatedStyle(() => ({ opacity: ring.value === 0 ? 0 : 0.7 * (1 - ring.value), transform: [{ scale: 1 + ring.value * 1.4 }] }));

  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none" style={[{ width: size + 4, height: size + 4 }, style]}>
      <Animated.View style={[StyleSheet.absoluteFill, { borderRadius: radii.full, backgroundColor: chat.dot }, ringStyle]} />
      <View
        style={{
          position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
          borderRadius: radii.full,
          borderWidth: 2,
          borderColor: halo,
          backgroundColor: spark ? chat.ink : chat.dot,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: spark ? chat.ink : chat.dot,
          shadowOpacity: 0.9,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 0 },
        }}
      >
        {figure ? (
          <Text allowFontScaling={false} style={{ color: chat.onDot, fontSize: fontSizes.xs, lineHeight: fontSizes.xs + 2 }} strong variant="footnote">
            {figure}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
