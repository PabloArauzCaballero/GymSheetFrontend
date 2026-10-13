import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolateColor,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { useReduceMotion } from '@/notifications/use-reduce-motion';
import { restRing } from '@/theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const TAU = Math.PI * 2;
/** Puntos por vuelta: a este tamaño, 96 tramos rectos ya se leen como curva. */
const POINTS = 96;
/** Una vuelta de la fase: la onda «respira» en este tiempo. */
const PHASE_MS = 4200;
/** Una vuelta completa del conjunto alrededor del reloj. */
const ORBIT_MS = 14_000;

/**
 * Contorno de la onda en coordenadas polares: un círculo de radio `radius`
 * cuyo borde sube y baja `amp` con `lobes` crestas, modulado por una segunda
 * onda lenta para que las crestas no sean todas iguales (eso es lo que la hace
 * parecer líquida y no un engranaje). Corre en el hilo de UI.
 */
function wavePath(center: number, radius: number, amp: number, lobes: number, phase: number): string {
  'worklet';
  let d = '';
  for (let i = 0; i <= POINTS; i += 1) {
    const theta = (i / POINTS) * TAU;
    const swell = 0.62 + 0.38 * Math.sin(2 * theta - phase * 0.5);
    const r = radius + amp * Math.sin(lobes * theta + phase) * swell;
    const x = center + r * Math.cos(theta);
    const y = center + r * Math.sin(theta);
    d += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return `${d}Z`;
}

function WaveLayer({
  size,
  radius,
  amp,
  lobes,
  speed,
  phase,
  urgency,
  fillOpacity,
  strokeOpacity,
}: {
  size: number;
  radius: number;
  amp: number;
  lobes: number;
  /** Multiplicador de la fase: capas a distinta velocidad (y sentido) dan profundidad. */
  speed: number;
  phase: SharedValue<number>;
  urgency: SharedValue<number>;
  fillOpacity: number;
  strokeOpacity: number;
}) {
  const center = size / 2;
  const props = useAnimatedProps(() => {
    // Al acercarse el final la onda se agita un poco más: se nota que se acaba sin leer el número.
    const a = amp * (1 + urgency.value * 0.45);
    const color = interpolateColor(urgency.value, [0, 1], [restRing.calm, restRing.ending]);
    return { d: wavePath(center, radius, a, lobes, phase.value * speed), fill: color, stroke: color };
  });
  return <AnimatedPath animatedProps={props} fillOpacity={fillOpacity} strokeOpacity={strokeOpacity} strokeWidth={1.5} />;
}

/**
 * La onda que gira alrededor del reloj del descanso: dos capas de líquido que
 * ondulan a distinta velocidad y en sentidos opuestos mientras todo el conjunto
 * orbita despacio. Es el «está corriendo» del descanso: se ve con el rabillo
 * del ojo, sin tener que leer la cifra.
 *
 * Bucle con causa (el descanso está en marcha) y uno solo por pantalla. Se
 * detiene al desmontarse; con «Reducir movimiento» queda la forma quieta.
 */
export function RestWave({ size, radius, ending }: { size: number; radius: number; ending: boolean }) {
  const reduceMotion = useReduceMotion();
  const phase = useSharedValue(0);
  const orbit = useSharedValue(0);
  const urgency = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(phase);
      cancelAnimation(orbit);
      phase.value = 0;
      orbit.value = 0;
      return;
    }
    phase.value = 0;
    orbit.value = 0;
    phase.value = withRepeat(withTiming(TAU, { duration: PHASE_MS, easing: Easing.linear }), -1, false);
    orbit.value = withRepeat(withTiming(360, { duration: ORBIT_MS, easing: Easing.linear }), -1, false);
    return () => {
      cancelAnimation(phase);
      cancelAnimation(orbit);
    };
  }, [orbit, phase, reduceMotion]);

  useEffect(() => {
    urgency.value = withTiming(ending ? 1 : 0, { duration: reduceMotion ? 0 : 600 });
  }, [ending, reduceMotion, urgency]);

  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${orbit.value}deg` }] }));

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}
    >
      <Animated.View style={[{ width: size, height: size }, spin]}>
        <Svg height={size} width={size}>
          {/* Capa de fondo: ancha, lenta, casi solo relleno. */}
          <WaveLayer amp={9} fillOpacity={0.1} lobes={4} phase={phase} radius={radius} size={size} speed={-1} strokeOpacity={0.28} urgency={urgency} />
          {/* Capa de delante: más crestas, más rápida, con el filo marcado. */}
          <WaveLayer amp={6} fillOpacity={0.08} lobes={7} phase={phase} radius={radius - 4} size={size} speed={2} strokeOpacity={0.55} urgency={urgency} />
        </Svg>
      </Animated.View>
    </View>
  );
}
