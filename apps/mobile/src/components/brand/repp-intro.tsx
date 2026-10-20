import { useEffect, useMemo, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
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
  glowOpacity,
  INTRO,
  irisPath,
  irisRadius,
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
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

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
 * paralelas que puedan desincronizarse. La salida tiene su propio valor
 * (`exit`, 0–1): el fondo es un trazado con un agujero que se abre en iris.
 */

/** Techo absoluto: si la sesión no llega, la cortinilla se va igualmente. */
const TOTAL_BUDGET = 3000;
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
      // La curva del iris va en `irisRadius`; aquí el reloj corre lineal.
      { duration: reduceMotion ? 320 : INTRO.exitIn, easing: Easing.linear },
      (finished) => {
        if (finished === true) runOnJS(onFinish)();
      },
    );
    return () => cancelAnimation(exit);
  }, [exit, onFinish, reduceMotion, shouldExit]);

  // Con movimiento reducido no hay iris: el escenario se funde, sin más.
  const stageStyle = useAnimatedStyle(() => ({ opacity: reduceMotion ? 1 - exit.value : 1 }));
  // El logotipo avanza hacia quien mira y se apaga antes de que el iris llegue
  // a las letras: la salida se lee como un paso adelante, no como un apagón.
  const lockupStyle = useAnimatedStyle(() => ({
    opacity: 1 - Math.min(1, exit.value * 3.2),
    transform: [{ scale: 1 + (reduceMotion ? 0 : exit.value * 0.12) }],
  }));
  const curtainProps = useAnimatedProps(() => ({ d: irisPath(reduceMotion ? 0 : exit.value, layout) }));
  const ringProps = useAnimatedProps(() => {
    const e = reduceMotion ? 0 : exit.value;
    return { r: irisRadius(e, layout), strokeOpacity: Math.min(1, e * 6) * (1 - e) };
  });
  const glowProps = useAnimatedProps(() => ({ opacity: glowOpacity(clock.value) }));
  const glowRadius = Math.max(width, height) * 0.42;

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
      style={[StyleSheet.absoluteFill, stageStyle]}
    >
      {/* El telón: navy plano (idéntico al splash) con el agujero del iris. */}
      <Svg height={height} style={StyleSheet.absoluteFill} viewBox={`0 0 ${width} ${height}`} width={width}>
        <AnimatedPath animatedProps={curtainProps} fill={brandNavy} fillRule="evenodd" />
        <AnimatedCircle animatedProps={ringProps} cx={width / 2} cy={height / 2} fill="none" stroke={reppJade} strokeWidth={2.5} />
      </Svg>
      <Animated.View style={[StyleSheet.absoluteFill, lockupStyle]}>
        <Svg height={height} viewBox={`0 0 ${width} ${height}`} width={width}>
          <Defs>
            <RadialGradient cx="50%" cy="50%" id="repp-glow" r="50%">
              <Stop offset="0" stopColor={reppJade} stopOpacity={0.55} />
              <Stop offset="0.45" stopColor={reppJade} stopOpacity={0.14} />
              <Stop offset="1" stopColor={reppJade} stopOpacity={0} />
            </RadialGradient>
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

          <AnimatedCircle animatedProps={glowProps} cx={width / 2} cy={height / 2} fill="url(#repp-glow)" r={glowRadius} />

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
