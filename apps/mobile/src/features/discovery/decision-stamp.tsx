import { Text } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { alpha, fontSizes, ink, radii, spacing } from '@/theme';

const STAMP_TOP = spacing.xl + 10;

/**
 * The stamp under the finger while dragging: the decision reads before release.
 * Driven by the same offset that moves the card, so it cannot drift from it.
 */
export function DecisionStamp({
  color,
  label,
  side,
  threshold,
  translateX,
}: {
  color: string;
  label: string;
  side: 'left' | 'right';
  threshold: number;
  translateX: SharedValue<number>;
}) {
  const sign = side === 'left' ? 1 : -1;
  const animated = useAnimatedStyle(() => ({
    opacity: Math.min(Math.max((sign * translateX.value) / threshold, 0), 1),
  }));

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          top: STAMP_TOP,
          left: side === 'left' ? spacing.lg : undefined,
          right: side === 'right' ? spacing.lg : undefined,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.xs,
          borderRadius: radii.md,
          borderWidth: 3,
          borderColor: color,
          alignItems: 'center',
          backgroundColor: alpha(ink.black, 0.3),
          transform: [{ rotate: side === 'left' ? '-12deg' : '12deg' }],
        },
        animated,
      ]}
    >
      <Text style={{ color, fontSize: fontSizes.xl, fontWeight: '800', letterSpacing: 1.5 }}>{label}</Text>
    </Animated.View>
  );
}
