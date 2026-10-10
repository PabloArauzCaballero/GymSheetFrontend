import { useEffect } from 'react';
import Animated, {
  Easing,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '@/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * Anillo del descanso: se vacía con el tiempo que queda. El trazo sigue al
 * tic con un deslizamiento lineal de un tic (250 ms), así se lee continuo y no
 * a saltos; con «reducir movimiento», salta al valor sin animar.
 */
export function RestRing({
  size,
  stroke,
  progress,
  finished = false,
}: {
  size: number;
  stroke: number;
  /** 1 = lleno (empieza), 0 = vacío (terminado). */
  progress: number;
  finished?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const value = useSharedValue(progress);

  useEffect(() => {
    const clamped = Math.min(1, Math.max(0, progress));
    value.value = reduceMotion ? clamped : withTiming(clamped, { duration: 250, easing: Easing.linear });
  }, [progress, reduceMotion, value]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - value.value),
  }));

  // Los colores se leen fuera del worklet: el acento cambia con la marca.
  const track = colors.surfaceHighest;
  const fill = finished ? colors.success : colors.volt;

  return (
    <Svg height={size} style={{ transform: [{ rotate: '-90deg' }] }} width={size}>
      <Circle cx={size / 2} cy={size / 2} fill="none" r={radius} stroke={track} strokeWidth={stroke} />
      <AnimatedCircle
        animatedProps={animatedProps}
        cx={size / 2}
        cy={size / 2}
        fill="none"
        r={radius}
        stroke={fill}
        strokeDasharray={`${circumference} ${circumference}`}
        strokeLinecap="round"
        strokeWidth={stroke}
      />
    </Svg>
  );
}
