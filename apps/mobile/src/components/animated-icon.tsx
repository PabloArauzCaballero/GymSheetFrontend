import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useReduceMotion } from '@/notifications/use-reduce-motion';
import { colors, iconSizes } from '@/theme';

/**
 * Catálogo de movimientos de icono. Cada uno es un lazo corto que describe lo
 * que el icono ES: el corazón late, la llama oscila, la mancuerna se levanta.
 * Con «Reducir movimiento» el icono se queda quieto (un lazo infinito es lo que
 * esa preferencia existe para apagar).
 */
export type IconMotion = 'beat' | 'bounce' | 'spin' | 'pulse' | 'wiggle' | 'lift' | 'flicker' | 'float' | 'tick' | 'sway';

const EASE = Easing.bezier(0.4, 0, 0.2, 1);

function run(motion: IconMotion, v: { s: { value: number }; r: { value: number }; y: { value: number } }) {
  'worklet';
  const t = (value: number, duration: number) => withTiming(value, { duration, easing: EASE });
  switch (motion) {
    case 'beat':
      v.s.value = withRepeat(withSequence(t(1.22, 160), t(1, 160), t(1.12, 120), t(1, 160), t(1, 700)), -1, false);
      break;
    case 'pulse':
      v.s.value = withRepeat(withSequence(t(1.12, 700), t(0.96, 700)), -1, true);
      break;
    case 'bounce':
      v.y.value = withRepeat(withSequence(t(-5, 260), withSpring(0, { damping: 6, stiffness: 240 }), t(0, 900)), -1, false);
      break;
    case 'spin':
      v.r.value = withRepeat(withTiming(360, { duration: 2600, easing: Easing.linear }), -1, false);
      break;
    case 'wiggle':
      v.r.value = withRepeat(withSequence(t(-14, 90), t(14, 140), t(-10, 120), t(0, 90), t(0, 1400)), -1, false);
      break;
    case 'lift':
      v.y.value = withRepeat(withSequence(t(-6, 520), t(0, 420), t(0, 700)), -1, false);
      v.r.value = withRepeat(withSequence(t(-6, 520), t(0, 420), t(0, 700)), -1, false);
      break;
    case 'flicker':
      v.s.value = withRepeat(withSequence(t(1.08, 180), t(0.94, 140), t(1.04, 200), t(1, 160)), -1, false);
      v.r.value = withRepeat(withSequence(t(-4, 220), t(4, 260), t(0, 200)), -1, false);
      break;
    case 'float':
      v.y.value = withRepeat(withSequence(t(-3, 1100), t(3, 1100)), -1, true);
      break;
    case 'tick':
      v.r.value = withRepeat(withSequence(t(12, 140), t(-12, 140), t(0, 140), t(0, 1600)), -1, false);
      break;
    case 'sway':
      v.r.value = withRepeat(withSequence(t(-8, 900), t(8, 900)), -1, true);
      break;
  }
}

/**
 * Un icono de Ionicons con movimiento propio. `active={false}` lo detiene en
 * reposo (útil para que solo se mueva el seleccionado). `delay` escalona varios.
 * Decorativo: queda fuera de la accesibilidad; la etiqueta la pone quien lo usa.
 */
export function AnimatedIcon({
  name,
  motion = 'pulse',
  color = colors.text,
  size = iconSizes.md,
  active = true,
  delay = 0,
}: {
  name: keyof typeof Ionicons.glyphMap;
  motion?: IconMotion;
  color?: string;
  size?: number;
  active?: boolean;
  delay?: number;
}) {
  const reduceMotion = useReduceMotion();
  const s = useSharedValue(1);
  const r = useSharedValue(0);
  const y = useSharedValue(0);

  useEffect(() => {
    const values = { s, r, y };
    if (reduceMotion || !active) {
      s.value = withTiming(1, { duration: 160 });
      r.value = withTiming(0, { duration: 160 });
      y.value = withTiming(0, { duration: 160 });
      return;
    }
    const timer = setTimeout(() => run(motion, values), delay);
    return () => {
      clearTimeout(timer);
      cancelAnimation(s);
      cancelAnimation(r);
      cancelAnimation(y);
    };
  }, [active, delay, motion, reduceMotion, r, s, y]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }, { rotate: `${r.value}deg` }, { scale: s.value }],
  }));

  return (
    <Animated.View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={style}>
      <Ionicons color={color} name={name} size={size} />
    </Animated.View>
  );
}

/** Un solo golpe (no lazo) al aparecer: el icono «entra» con un resorte. */
export function EntranceIcon({
  name,
  color = colors.text,
  size = iconSizes.md,
  delay = 0,
}: {
  name: keyof typeof Ionicons.glyphMap;
  color?: string;
  size?: number;
  delay?: number;
}) {
  const reduceMotion = useReduceMotion();
  const scale = useSharedValue(reduceMotion ? 1 : 0.4);
  useEffect(() => {
    if (!reduceMotion) scale.value = withDelay(delay, withSpring(1, { damping: 9, stiffness: 220 }));
  }, [delay, reduceMotion, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={style}>
      <Ionicons color={color} name={name} size={size} />
    </Animated.View>
  );
}
