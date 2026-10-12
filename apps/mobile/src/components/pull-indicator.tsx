import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useScrollY } from '@/components/hero-bar';
import { useReduceMotion } from '@/notifications/use-reduce-motion';
import { accentPolicy, colors, iconSizes, radii, shadows } from '@/theme';

const SIZE = 40;
/** Lo que hay que tirar para que el sistema dispare la recarga. */
const PULL = 72;

/**
 * Indicador propio de «tirar para actualizar»: un disco con la barra de pesas
 * que asoma y gira con el dedo, y que sigue girando mientras llegan los datos.
 * Sustituye a la rueda gris del sistema (que se deja transparente). Responde a
 * «¿me hizo caso?»: se mueve solo con el gesto o con la carga que el gesto
 * provocó. Con «Reducir movimiento» aparece sin girar.
 */
export function PullIndicator({ refreshing, top }: { refreshing: boolean; top: number }) {
  const scrollY = useScrollY();
  const reduceMotion = useReduceMotion();
  const spin = useSharedValue(0);
  const shown = useSharedValue(0);

  useEffect(() => {
    shown.value = withTiming(refreshing ? 1 : 0, { duration: refreshing ? 120 : 220 });
    if (!refreshing || reduceMotion) {
      cancelAnimation(spin);
      spin.value = 0;
      return;
    }
    spin.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(spin);
  }, [reduceMotion, refreshing, shown, spin]);

  const disc = useAnimatedStyle(() => {
    const pull = interpolate(-scrollY.value, [8, PULL], [0, 1], Extrapolation.CLAMP);
    const visible = Math.max(pull, shown.value);
    return {
      opacity: visible,
      transform: [
        { translateY: interpolate(visible, [0, 1], [-12, 0]) },
        { scale: interpolate(visible, [0, 1], [0.7, 1]) },
        { rotate: `${reduceMotion ? 0 : pull * 180 + spin.value * 360}deg` },
      ],
    };
  });

  return (
    <View pointerEvents="none" style={{ position: 'absolute', top, left: 0, right: 0, alignItems: 'center' }}>
      <Animated.View
        style={[
          {
            width: SIZE,
            height: SIZE,
            borderRadius: radii.full,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.surfaceHigh,
            boxShadow: shadows.e2,
          },
          disc,
        ]}
      >
        <Ionicons color={accentPolicy.glyph} name="barbell" size={iconSizes.md} />
      </Animated.View>
    </View>
  );
}
