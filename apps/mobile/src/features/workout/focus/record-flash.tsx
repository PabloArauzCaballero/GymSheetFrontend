import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown, FadeOutUp, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Burst } from '@/components/motion';
import { Text } from '@/components/text';
import { useReduceMotion } from '@/notifications/use-reduce-motion';
import { iconSizes, metricColors, radii, shadows, spacing } from '@/theme';

/**
 * Destello cuando una serie supera a la mejor de la última vez. Va por encima
 * de todo (también del descanso), no recibe toques y se va solo: celebra sin
 * pedir nada. La tabla de récords de verdad sale al cerrar la sesión.
 */
export function RecordFlash({ flash }: { flash: { key: number; label: string } | null }) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const glow = useSharedValue(0);

  useEffect(() => {
    if (!flash || reduceMotion) return;
    glow.value = 0;
    glow.value = withRepeat(withSequence(withTiming(1, { duration: 420 }), withTiming(0.35, { duration: 420 })), 2, false);
  }, [flash, glow, reduceMotion]);

  const halo = useAnimatedStyle(() => ({ opacity: 0.35 + glow.value * 0.65 }));

  if (!flash) return null;
  const ink = metricColors.record;
  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      entering={reduceMotion ? undefined : FadeInDown.springify().damping(16)}
      exiting={reduceMotion ? undefined : FadeOutUp.duration(220)}
      key={flash.key}
      pointerEvents="none"
      style={{ position: 'absolute', top: insets.top + spacing.sm, left: 0, right: 0, alignItems: 'center', zIndex: 40 }}
      testID="record-flash"
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
          borderRadius: radii.full,
          borderCurve: 'continuous',
          borderWidth: 1,
          borderColor: ink.edge,
          backgroundColor: ink.tint,
          boxShadow: shadows.e2,
        }}
      >
        <View style={{ width: iconSizes.lg, height: iconSizes.lg, alignItems: 'center', justifyContent: 'center' }}>
          <Burst active color={ink.ink} radius={18} />
          <Animated.View style={halo}>
            <Ionicons color={ink.ink} name="trophy" size={iconSizes.md} />
          </Animated.View>
        </View>
        <View>
          <Text strong style={{ color: ink.ink }} variant="subhead">
            ¡Mejor que la última vez!
          </Text>
          <Text tabular tone="secondary" variant="footnote">
            {flash.label}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}
