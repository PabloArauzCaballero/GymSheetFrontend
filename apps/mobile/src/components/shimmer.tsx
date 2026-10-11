import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { shimmerBand } from '@/theme';

/**
 * La franja de luz que cruza un esqueleto en diagonal (patrón de Atlas).
 *
 * Un bloque que solo parpadea se lee como «roto»; la franja que viaja dice
 * «esto está llegando». Solo `translateX` en el hilo de UI, así que no se
 * entrecorta mientras la pantalla parsea justo la respuesta que espera. Con
 * movimiento reducido no hay franja. Se pinta encima de lo que haya debajo y
 * no recibe toques.
 */
export function Shimmer() {
  const reduceMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion || width === 0) return;
    progress.value = 0;
    progress.value = withRepeat(withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.quad) }), -1, false);
    return () => cancelAnimation(progress);
  }, [progress, reduceMotion, width]);

  const band = useAnimatedStyle(() => ({
    transform: [{ translateX: -width * 0.6 + progress.value * width * 1.6 }, { skewX: '-18deg' }],
  }));

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}
    >
      {!reduceMotion && width > 0 ? (
        <Animated.View style={[{ position: 'absolute', top: 0, bottom: 0, width: width * 0.6 }, band]}>
          <LinearGradient
            colors={shimmerBand}
            end={{ x: 1, y: 0.5 }}
            start={{ x: 0, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}
