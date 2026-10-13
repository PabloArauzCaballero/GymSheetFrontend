import { BlurView } from 'expo-blur';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { PressableScale } from '@/components/motion';
import { Text } from '@/components/text';
import { Button } from '@/components/ui';
import {
  REST_STEP_SEC,
  formatRestClock,
  speakRest,
  useRestRemaining,
  useWorkoutStore,
} from '@/features/workout/workout-store';
import { useReduceMotion } from '@/notifications/use-reduce-motion';
import { alpha, colors, fontFamilies, gutter, motion, radii, spacing, tabularNums } from '@/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const DIAL = 264;
const STROKE = 10;
/** Cifra del reloj: la protagonista de la pantalla, fuera de la rampa a propósito. */
const CLOCK_FONT = 72;

/**
 * El anillo del descanso, animado en el hilo de UI: una sola interpolación
 * lineal desde lo que queda hasta cero, que se rearma si cambia el fin
 * (−15 / +15). No depende de los tics de React, así que no da saltos aunque el
 * hilo de JS esté ocupado guardando la serie.
 */
function RestDial({ endsAt, totalMs }: { endsAt: number; totalMs: number }) {
  const reduceMotion = useReduceMotion();
  const radius = (DIAL - STROKE) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = useSharedValue(1);

  useEffect(() => {
    const remaining = Math.max(0, endsAt - Date.now());
    const from = totalMs > 0 ? Math.min(1, remaining / totalMs) : 0;
    cancelAnimation(progress);
    progress.value = from;
    // Con «Reducir movimiento» el anillo no viaja: el reloj ya dice cuánto queda.
    if (!reduceMotion) progress.value = withTiming(0, { duration: remaining, easing: Easing.linear });
    return () => cancelAnimation(progress);
  }, [endsAt, totalMs, reduceMotion, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  return (
    <Svg height={DIAL} style={{ transform: [{ rotate: '-90deg' }] }} width={DIAL}>
      <Circle cx={DIAL / 2} cy={DIAL / 2} fill="none" r={radius} stroke={colors.surfaceHighest} strokeWidth={STROKE} />
      <AnimatedCircle
        animatedProps={animatedProps}
        cx={DIAL / 2}
        cy={DIAL / 2}
        fill="none"
        r={radius}
        stroke={colors.text}
        strokeDasharray={`${circumference} ${circumference}`}
        strokeLinecap="round"
        strokeWidth={STROKE}
      />
    </Svg>
  );
}

function Adjust({ label, spoken, onPress, testID }: { label: string; spoken: string; onPress: () => void; testID?: string }) {
  return (
    <PressableScale
      accessibilityLabel={spoken}
      haptic="selection"
      onPress={onPress}
      scaleTo={0.94}
      style={{
        minWidth: 96,
        height: 56,
        paddingHorizontal: spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radii.full,
        backgroundColor: colors.surfaceHighest,
      }}
      testID={testID}
    >
      <Text strong tabular variant="headline">
        {label}
      </Text>
    </PressableScale>
  );
}

/**
 * Descanso a pantalla completa. Mientras corre, es lo único que hay: el reloj,
 * lo que viene y tres decisiones (−15, +15, saltar). Tapa y bloquea lo de
 * debajo: con la barra flotante de antes se podía seguir tocando la serie
 * siguiente con el descanso en marcha y no quedaba claro si se estaba
 * entrenando o descansando. Se cierra sola al llegar a cero.
 */
export function RestOverlay({ kind }: { kind: 'set' | 'between' | 'round' | 'none' }) {
  const insets = useSafeAreaInsets();
  const { remainingMs, totalMs, running } = useRestRemaining();
  const endsAt = useWorkoutStore((state) => state.restEndsAt);
  const next = useWorkoutStore((state) => state.restNext);
  const adjust = useWorkoutStore((state) => state.adjustRest);
  const skip = useWorkoutStore((state) => state.skipRest);

  if (!running || endsAt === null) return null;

  const title = kind === 'between' ? 'Cambio de ejercicio' : kind === 'round' ? 'Descanso de la vuelta' : 'Descanso';

  return (
    <Animated.View
      accessibilityViewIsModal
      entering={FadeIn.duration(motion.enter)}
      exiting={FadeOut.duration(motion.exit)}
      style={[StyleSheet.absoluteFill, { zIndex: 20 }]}
      testID="rest-bar"
    >
      <BlurView intensity={50} style={StyleSheet.absoluteFill} tint="dark" />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: alpha(colors.background, 0.9) }]} />
      <View
        style={{
          flex: 1,
          paddingTop: insets.top + spacing.xl,
          paddingBottom: insets.bottom + spacing.lg,
          paddingHorizontal: gutter,
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text accessibilityRole="header" tone="secondary" variant="headline">
          {title}
        </Text>

        <View style={{ alignItems: 'center', gap: spacing.xl }}>
          <View style={{ width: DIAL, height: DIAL, alignItems: 'center', justifyContent: 'center' }}>
            <View style={StyleSheet.absoluteFill}>
              <RestDial endsAt={endsAt} totalMs={totalMs} />
            </View>
            <Text
              accessibilityLabel={speakRest(remainingMs)}
              accessibilityLiveRegion="polite"
              style={[{ fontFamily: fontFamilies.display, fontSize: CLOCK_FONT, color: colors.text }, tabularNums]}
              testID="rest-bar-clock"
            >
              {formatRestClock(remainingMs)}
            </Text>
            <Text tabular tone="muted" variant="footnote">
              {`de ${formatRestClock(totalMs)}`}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <Adjust label={`−${REST_STEP_SEC} s`} onPress={() => adjust(-REST_STEP_SEC)} spoken={`Quitar ${REST_STEP_SEC} segundos`} testID="rest-minus" />
            <Adjust label={`+${REST_STEP_SEC} s`} onPress={() => adjust(REST_STEP_SEC)} spoken={`Añadir ${REST_STEP_SEC} segundos`} testID="rest-plus" />
          </View>
        </View>

        <View style={{ alignSelf: 'stretch', gap: spacing.md }}>
          {next ? (
            <View
              style={{
                gap: spacing.xxs,
                padding: spacing.md,
                borderRadius: radii.xl,
                borderCurve: 'continuous',
                backgroundColor: colors.surfaceLow,
              }}
            >
              <Text tone="muted" variant="caption">
                A CONTINUACIÓN
              </Text>
              <Text numberOfLines={2} strong variant="headline">
                {next}
              </Text>
            </View>
          ) : null}
          <Button label="Saltar descanso" onPress={skip} size="lg" testID="rest-skip" variant="secondary" />
        </View>
      </View>
    </Animated.View>
  );
}
