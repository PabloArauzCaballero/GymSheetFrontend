import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  interpolateColor,
  useAnimatedProps,
  useSharedValue,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { RestWave } from './rest-wave';
import { ExerciseImage } from '@/components/media';
import { Burst, Pop, PressableScale, PREMIUM_EASING } from '@/components/motion';
import { Text } from '@/components/text';
import { Button } from '@/components/ui';
import {
  REST_STEP_SEC,
  formatRestClock,
  speakRest,
  useForegroundTick,
  useRestBelow,
  useRestRemaining,
  useRestStatus,
  useWorkoutStore,
} from '@/features/workout/workout-store';
import { useReduceMotion } from '@/notifications/use-reduce-motion';
import { alpha, colors, fontFamilies, gutter, iconSizes, metricColors, motion, radii, restRing, spacing, tabularNums } from '@/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const DIAL = 264;
const STROKE = 10;
/** Lienzo de la onda: sobresale del anillo por fuera. */
const WAVE = DIAL + 76;
/** Radio medio de la onda: por fuera del anillo, sin cruzarlo ni en la cresta más honda. */
const WAVE_RADIUS = DIAL / 2 + 18;
/** La cabeza del anillo: un punto de luz que marca dónde va el tiempo. */
const HEAD = STROKE * 0.9;
/** Margen del lienzo del anillo para que el halo de la cabeza no se recorte en el borde. */
const PAD = 16;
/** Cifra del reloj: la protagonista de la pantalla, fuera de la rampa a propósito. */
const CLOCK_FONT = 72;
/** Desde aquí el anillo vira de menta a ámbar: «se acaba». */
const ENDING_MS = 10_000;
/** Los últimos segundos laten uno a uno. */
const PULSE_FROM_SEC = 3;
const THUMB = 52;

/**
 * El anillo del descanso, animado en el hilo de UI: una sola interpolación
 * lineal desde lo que queda hasta cero, que se rearma si cambia el fin
 * (−15 / +15, «Cambiar descanso») o si la app vuelve de segundo plano. No
 * depende de los tics de React, así que no da saltos aunque el hilo de JS
 * esté ocupado guardando la serie. El color vira al acercarse el final.
 */
function RestDial({ endsAt, totalMs, ending }: { endsAt: number; totalMs: number; ending: boolean }) {
  const reduceMotion = useReduceMotion();
  const foreground = useForegroundTick();
  const radius = (DIAL - STROKE) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = useSharedValue(1);
  const urgency = useSharedValue(0);

  useEffect(() => {
    const remaining = Math.max(0, endsAt - Date.now());
    const from = totalMs > 0 ? Math.min(1, remaining / totalMs) : 0;
    cancelAnimation(progress);
    progress.value = from;
    // Con «Reducir movimiento» el anillo no viaja: el reloj ya dice cuánto queda.
    if (!reduceMotion) progress.value = withTiming(0, { duration: remaining, easing: Easing.linear });
    return () => cancelAnimation(progress);
  }, [endsAt, totalMs, reduceMotion, progress, foreground]);

  useEffect(() => {
    urgency.value = withTiming(ending ? 1 : 0, { duration: reduceMotion ? 0 : 600, easing: PREMIUM_EASING });
  }, [ending, reduceMotion, urgency]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
    stroke: interpolateColor(urgency.value, [0, 1], [restRing.calm, restRing.ending]),
  }));
  // La cabeza viaja con el final del arco (el Svg está girado −90°: el ángulo 0 es arriba).
  const headProps = useAnimatedProps(() => {
    const angle = progress.value * 2 * Math.PI;
    return {
      cx: PAD + DIAL / 2 + radius * Math.cos(angle),
      cy: PAD + DIAL / 2 + radius * Math.sin(angle),
      fill: interpolateColor(urgency.value, [0, 1], [restRing.calm, restRing.ending]),
      opacity: progress.value > 0.004 ? 1 : 0,
    };
  });

  return (
    <Svg height={DIAL + PAD * 2} style={{ margin: -PAD, transform: [{ rotate: '-90deg' }] }} width={DIAL + PAD * 2}>
      <Circle cx={PAD + DIAL / 2} cy={PAD + DIAL / 2} fill="none" r={radius} stroke={restRing.track} strokeWidth={STROKE} />
      <AnimatedCircle
        animatedProps={animatedProps}
        cx={PAD + DIAL / 2}
        cy={PAD + DIAL / 2}
        fill="none"
        r={radius}
        strokeDasharray={`${circumference} ${circumference}`}
        strokeLinecap="round"
        strokeWidth={STROKE}
      />
      {/* Halo y núcleo de la cabeza. */}
      <AnimatedCircle animatedProps={headProps} fillOpacity={0.25} r={HEAD * 1.9} />
      <AnimatedCircle animatedProps={headProps} r={HEAD * 0.75} stroke={colors.text} strokeWidth={2} />
    </Svg>
  );
}

function Adjust({
  label,
  spoken,
  icon,
  onPress,
  testID,
}: {
  label: string;
  spoken: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <PressableScale
      accessibilityLabel={spoken}
      haptic="selection"
      onPress={onPress}
      scaleTo={0.94}
      style={{
        flexDirection: 'row',
        gap: spacing.xs,
        minWidth: 88,
        height: 52,
        paddingHorizontal: spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radii.full,
        backgroundColor: colors.surfaceHighest,
      }}
      testID={testID}
    >
      {icon ? <Ionicons color={metricColors.rest.ink} name={icon} size={iconSizes.sm} /> : null}
      <Text strong tabular variant="subhead">
        {label}
      </Text>
    </PressableScale>
  );
}

/**
 * La cifra del descanso. Aislada: su tic (uno por segundo, alineado con el
 * cambio de la cifra) repinta solo este texto, no la pantalla con su desenfoque.
 */
function RestClock({ ending }: { ending: boolean }) {
  const { remainingMs } = useRestRemaining();
  const secondsLeft = Math.ceil(remainingMs / 1000);
  return (
    // Los tres últimos segundos laten: uno por segundo, con causa (se acaba).
    <Pop trigger={secondsLeft <= PULSE_FROM_SEC ? secondsLeft : 'calm'}>
      <Text
        accessibilityLabel={speakRest(remainingMs)}
        accessibilityLiveRegion="polite"
        maxFontSizeMultiplier={1.1}
        style={[
          { fontFamily: fontFamilies.display, fontSize: CLOCK_FONT, lineHeight: CLOCK_FONT + 12, color: ending ? restRing.ending : colors.text },
          tabularNums,
        ]}
        testID="rest-bar-clock"
      >
        {formatRestClock(remainingMs)}
      </Text>
    </Pop>
  );
}

const TIPS: Record<'set' | 'between' | 'round' | 'none', string> = {
  set: 'Respira hondo y suelta los hombros.',
  between: 'Cambia de sitio con calma: ya casi.',
  round: 'Vuelta hecha. Bebe un poco de agua.',
  none: '',
};

/**
 * Descanso a pantalla completa. Mientras corre, es lo único que hay: el reloj,
 * lo que viene y las decisiones sobre el tiempo (−15, +15, cambiarlo, saltar).
 * Tapa y bloquea lo de debajo: con la barra flotante de antes se podía seguir
 * tocando la serie siguiente con el descanso en marcha y no quedaba claro si
 * se estaba entrenando o descansando. Se cierra sola al llegar a cero.
 */
export function RestOverlay({ kind, onChangeRest }: { kind: 'set' | 'between' | 'round' | 'none'; onChangeRest?: () => void }) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  // Sin tic aquí: esta pantalla (con BlurView) solo se repinta al empezar,
  // ajustar o acabar el descanso, y una vez al entrar en los diez últimos segundos.
  const { endsAt, totalMs, running } = useRestStatus();
  const ending = useRestBelow(endsAt, ENDING_MS);
  const next = useWorkoutStore((state) => state.restNextDetail);
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
          paddingTop: insets.top + spacing.lg,
          paddingBottom: insets.bottom + spacing.md,
          paddingHorizontal: gutter,
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ alignItems: 'center', gap: spacing.xs }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Ionicons color={metricColors.rest.ink} name="hourglass-outline" size={iconSizes.md} />
            <Text accessibilityRole="header" variant="headline">
              {title}
            </Text>
          </View>
          {next?.finished ? (
            // Lo que se acaba de cerrar con esa serie: el «hecho» se celebra aquí, que es donde se mira.
            <Animated.View
              entering={reduceMotion ? undefined : ZoomIn.duration(motion.enter).easing(PREMIUM_EASING).withInitialValues({ transform: [{ scale: 0.8 }] })}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.xs,
                height: 32,
                paddingHorizontal: spacing.smd,
                marginTop: spacing.xs,
                borderRadius: radii.full,
                backgroundColor: colors.surfaceHighest,
              }}
              testID="rest-finished"
            >
              <View style={{ width: iconSizes.sm, height: iconSizes.sm, alignItems: 'center', justifyContent: 'center' }}>
                <Burst active color={colors.success} radius={18} />
                <Ionicons color={colors.success} name="checkmark-circle" size={iconSizes.sm} />
              </View>
              <Text numberOfLines={1} strong variant="footnote">
                {next.finished}
              </Text>
            </Animated.View>
          ) : (
            <Text tone="muted" variant="footnote">
              {TIPS[kind]}
            </Text>
          )}
        </View>

        <Animated.View
          entering={reduceMotion ? undefined : ZoomIn.duration(motion.enter).easing(PREMIUM_EASING).withInitialValues({ transform: [{ scale: 0.94 }] })}
          style={{ alignItems: 'center', gap: spacing.lg }}
        >
          <View style={{ width: DIAL, height: DIAL, alignItems: 'center', justifyContent: 'center' }}>
            {/* La onda que gira alrededor del reloj mientras el descanso corre. */}
            <RestWave ending={ending} radius={WAVE_RADIUS} size={WAVE} />
            <View style={StyleSheet.absoluteFill}>
              <RestDial ending={ending} endsAt={endsAt} totalMs={totalMs} />
            </View>
            <RestClock ending={ending} />
            <Text tabular tone="muted" variant="footnote">
              {`de ${formatRestClock(totalMs)}`}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Adjust label={`−${REST_STEP_SEC} s`} onPress={() => adjust(-REST_STEP_SEC)} spoken={`Quitar ${REST_STEP_SEC} segundos`} testID="rest-minus" />
            <Adjust label={`+${REST_STEP_SEC} s`} onPress={() => adjust(REST_STEP_SEC)} spoken={`Añadir ${REST_STEP_SEC} segundos`} testID="rest-plus" />
            {onChangeRest ? <Adjust icon="options-outline" label="Cambiar" onPress={onChangeRest} spoken="Cambiar el descanso" testID="rest-change" /> : null}
          </View>
        </Animated.View>

        <View style={{ alignSelf: 'stretch', gap: spacing.smd }}>
          {next ? (
            <Animated.View
              entering={reduceMotion ? undefined : FadeInDown.duration(motion.enter).delay(120)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.smd,
                padding: spacing.smd,
                borderRadius: radii.xl,
                borderCurve: 'continuous',
                backgroundColor: colors.surfaceLow,
              }}
              testID="rest-next"
            >
              <View style={{ width: THUMB, height: THUMB }}>
                {next.exercise ? <ExerciseImage exercise={next.exercise} rounded={radii.md} size="fill" /> : null}
              </View>
              <View style={{ flex: 1, gap: spacing.xxs }}>
                <Text tone="muted" variant="caption">
                  A CONTINUACIÓN
                </Text>
                <Text numberOfLines={1} strong variant="headline">
                  {next.name}
                </Text>
                {/* Paso y carga en su propia línea, sin partir: «25 kg × 9» nunca queda cortado en dos. */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <Text tabular tone="secondary" variant="footnote">
                    {next.step}
                  </Text>
                  {next.load ? (
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: spacing.xs,
                        paddingHorizontal: spacing.sm,
                        height: 24,
                        borderRadius: radii.full,
                        backgroundColor: metricColors[next.loadKind].tint,
                      }}
                    >
                      <Ionicons
                        color={metricColors[next.loadKind].ink}
                        name={next.loadKind === 'time' ? 'stopwatch-outline' : 'barbell-outline'}
                        size={iconSizes.xs}
                      />
                      <Text numberOfLines={1} strong style={{ color: metricColors[next.loadKind].ink }} tabular variant="footnote">
                        {next.load}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </Animated.View>
          ) : null}
          <Button icon="play-skip-forward" label="Saltar descanso" onPress={skip} size="lg" testID="rest-skip" variant="secondary" />
        </View>
      </View>
    </Animated.View>
  );
}
