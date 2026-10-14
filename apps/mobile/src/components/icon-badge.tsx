import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring } from 'react-native-reanimated';
import { SETTLE_SPRING } from '@/components/motion';
import { useReduceMotion } from '@/notifications/use-reduce-motion';
import { iconSizes, metricColors, radii, type MetricKey } from '@/theme';

/**
 * Icono con color por significado: la tinta de la magnitud sobre su tinte
 * (los mismos tonos del entreno — carga azul, racha naranja, récord oro…).
 * Entra con un salto corto al montarse; con «Reducir movimiento», quieto.
 */
export function IconBadge({
  icon,
  tone,
  size = 32,
  delay = 0,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tone: MetricKey;
  size?: number;
  /** Escalonado cuando hay varias juntas (ms). */
  delay?: number;
}) {
  const reduceMotion = useReduceMotion();
  const scale = useSharedValue(reduceMotion ? 1 : 0.6);
  useEffect(() => {
    if (reduceMotion) return;
    scale.value = withDelay(delay, withSpring(1, SETTLE_SPRING));
  }, [delay, reduceMotion, scale]);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const color = metricColors[tone];
  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: size >= 36 ? radii.lg : radii.md,
          borderCurve: 'continuous',
          borderWidth: 1,
          borderColor: color.edge,
          backgroundColor: color.tint,
        },
        animated,
      ]}
    >
      <Ionicons color={color.ink} name={icon} size={size >= 36 ? iconSizes.md : iconSizes.sm} />
    </Animated.View>
  );
}
