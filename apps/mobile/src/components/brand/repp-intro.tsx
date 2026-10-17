import { useEffect, useMemo, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { ClipPath, Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { brandNavy, onMedia, reppJade } from '@/theme';
import {
  appWordWidth,
  baselineClip,
  INTRO,
  introLayout,
  letterOpacity,
  letterPath,
  restingWordmark,
  rPath,
  sheenOpacity,
  sheenPath,
  SPLASH_UNIT,
  tickPath,
  type IntroLayout,
} from './intro-choreography';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/**
 * La cortinilla de REPP.
 *
 * Empieza **donde termina el splash nativo**: mismo fondo navy, mismo signo, en
 * el mismo sitio y al mismo tamaño (`SPLASH_UNIT`). Desde ahí la «R» del icono
 * se transforma punto a punto en la «R» del logotipo, el resto del nombre se
 * levanta desde la línea base y un destello lo cruza. La coreografía entera
 * está en `intro-choreography.ts`; aquí sólo se le da un reloj.
 *
 * Un único valor compartido (`clock`, en ms) mueve todo: cada trazado se
 * recalcula en el hilo de UI a partir de él, así que no hay animaciones
 * paralelas que puedan desincronizarse.
 */

/** Techo absoluto: si la sesión no llega, la cortinilla se va igualmente. */
const TOTAL_BUDGET = 2800;
const REDUCED_HOLD = 600;

export function ReppIntro({ ready, onFinish }: { ready: boolean; onFinish: () => void }) {
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const layout = useMemo(() => introLayout(width, height, SPLASH_UNIT, appWordWidth(width)), [width, height]);
  const resting = useMemo(() => restingWordmark(layout), [layout]);
  const clip = useMemo(() => baselineClip(layout), [layout]);

  const clock = useSharedValue(reduceMotion ? INTRO.main : 0);
  const exit = useSharedValue(0);
  const [timelineDone, setTimelineDone] = useState(false);
  const [overBudget, setOverBudget] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const pending = timers.current;
    const mainMs = reduceMotion ? REDUCED_HOLD : INTRO.main;
    if (!reduceMotion) {
      clock.value = withTiming(INTRO.main, { duration: INTRO.main, easing: Easing.linear });
      pending.push(
        setTimeout(() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }, INTRO.hapticAt),
      );
    }
    pending.push(setTimeout(() => setTimelineDone(true), mainMs));
    pending.push(setTimeout(() => setOverBudget(true), TOTAL_BUDGET - INTRO.exitIn));
    return () => {
      cancelAnimation(clock);
      pending.forEach(clearTimeout);
      pending.length = 0;
    };
  }, [clock, reduceMotion]);

  // Monótona: ver la nota de `shouldExit` en `brand-intro.tsx`.
  const shouldExit = timelineDone && (ready || overBudget);

  useEffect(() => {
    if (!shouldExit) return;
    exit.value = withTiming(
      1,
      { duration: INTRO.exitIn, easing: Easing.bezier(0.4, 0, 0.2, 1) },
      (finished) => {
        if (finished === true) runOnJS(onFinish)();
      },
    );
    return () => cancelAnimation(exit);
  }, [exit, onFinish, shouldExit]);

  const stageStyle = useAnimatedStyle(() => ({ opacity: 1 - exit.value }));
  // El logotipo se va un instante antes que el fondo y apenas se acerca: la
  // salida se lee como un paso adelante, no como un apagón.
  const lockupStyle = useAnimatedStyle(() => ({
    opacity: 1 - Math.min(1, exit.value * 1.6),
    transform: [{ scale: 1 + exit.value * 0.04 }],
  }));

  const rProps = useAnimatedProps(() => ({ d: rPath(clock.value, layout) }));
  const tickProps = useAnimatedProps(() => ({ d: tickPath(clock.value, layout) }));
  const sheenProps = useAnimatedProps(() => ({
    d: sheenPath(clock.value, layout),
    opacity: sheenOpacity(clock.value),
  }));

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { backgroundColor: brandNavy }, stageStyle]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, lockupStyle]}>
        <Svg height={height} viewBox={`0 0 ${width} ${height}`} width={width}>
          <Defs>
            <ClipPath id="repp-baseline">
              <Rect height={clip.height} width={clip.width} x={clip.x} y={clip.y} />
            </ClipPath>
            <ClipPath id="repp-ink">
              {resting.map((d) => (
                <Path key={d} d={d} />
              ))}
            </ClipPath>
            <LinearGradient id="repp-sheen" x1="0" x2="1" y1="0" y2="0">
              <Stop offset="0" stopColor={reppJade} stopOpacity={0} />
              <Stop offset="0.5" stopColor={reppJade} stopOpacity={0.85} />
              <Stop offset="1" stopColor={reppJade} stopOpacity={0} />
            </LinearGradient>
          </Defs>

          <G clipPath="url(#repp-baseline)">
            {[0, 1, 2].map((index) => (
              <Letter key={index} clock={clock} index={index} layout={layout} />
            ))}
          </G>
          <AnimatedPath animatedProps={rProps} fill={onMedia.text} fillRule="evenodd" />
          <AnimatedPath animatedProps={tickProps} fill={reppJade} />

          {/* El destello: una onda jade recortada a la tinta. Blanca no se vería
              sobre letras blancas; jade, el color del gesto recorre el nombre. */}
          {reduceMotion ? null : (
            <G clipPath="url(#repp-ink)">
              <AnimatedPath animatedProps={sheenProps} fill="url(#repp-sheen)" />
            </G>
          )}
        </Svg>
      </Animated.View>
    </Animated.View>
  );
}

function Letter({ clock, index, layout }: { clock: SharedValue<number>; index: number; layout: IntroLayout }) {
  const props = useAnimatedProps(() => ({
    d: letterPath(index, clock.value, layout),
    opacity: letterOpacity(index, clock.value),
  }));
  return <AnimatedPath animatedProps={props} fill={onMedia.text} />;
}
