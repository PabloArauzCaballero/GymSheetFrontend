import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { clockLabel, secondsLabel } from '@gymsheet/hooks';
import { PressableScale } from '@/components/motion';
import { Text } from '@/components/text';
import { useStopwatch } from '@/features/cardio/use-stopwatch';
import { Stepper } from '@/features/workout/focus/stepper';
import type { SetDraft } from '@/features/workout/set-inputs';
import { bumpSeconds, kgLabel, MAX_TIMED_SET_SEC } from '@/features/workout/workout-flow';
import { useReduceMotion } from '@/notifications/use-reduce-motion';
import { colors, iconSizes, metricColors, minTouchTarget, radii, spacing } from '@/theme';

/** Alto del botón del cronómetro: el control que más se toca con las manos ocupadas. */
const TIMER_HEIGHT = 64;

function bumpKg(text: string, delta: number): string {
  const current = Number(text.replace(',', '.'));
  const base = Number.isFinite(current) ? current : 0;
  return kgLabel(Math.max(0, Math.round((base + delta) * 100) / 100));
}

/**
 * Los campos de una serie por tiempo (plancha 45 s): los segundos, grandes, con
 * ±5 s de un toque; el lastre opcional; y un cronómetro que, mientras corre,
 * va escribiendo los segundos. Al llegar al objetivo vibra una vez. «Registrar
 * serie» sigue fijo abajo, como en las series por repeticiones.
 */
export function TimedSetInputs({
  value,
  onChange,
  targetSeconds,
  resetKey,
  lastTime,
}: {
  value: SetDraft;
  onChange: (next: SetDraft) => void;
  /** El `duracionSeg` del objetivo. */
  targetSeconds: number | null;
  /** Cambia al registrar una serie: el cronómetro vuelve a cero. */
  resetKey: number;
  /** El aguante más largo de la última vez, en otra sesión. */
  lastTime?: { seconds: number; when: string } | null;
}) {
  const clock = useStopwatch();
  const latest = useRef({ value, onChange });
  latest.current = { value, onChange };
  const buzzed = useRef(false);

  // Mientras corre, los segundos del cronómetro son los de la serie.
  useEffect(() => {
    if (!clock.running || clock.seconds < 1) return;
    const seconds = Math.min(MAX_TIMED_SET_SEC, clock.seconds);
    latest.current.onChange({ ...latest.current.value, duracionSeg: String(seconds) });
    if (targetSeconds !== null && seconds >= targetSeconds && !buzzed.current) {
      buzzed.current = true;
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [clock.running, clock.seconds, targetSeconds]);

  const { reset } = clock;
  useEffect(() => {
    reset();
    buzzed.current = false;
  }, [resetKey, reset]);

  const toggle = () => {
    if (clock.running) {
      clock.pause();
      return;
    }
    clock.reset();
    buzzed.current = false;
    clock.start();
  };

  const elapsed = clockLabel(clock.seconds);
  const target = targetSeconds !== null ? clockLabel(targetSeconds) : null;
  const reduceMotion = useReduceMotion();
  const [loaded, setLoaded] = useState(() => value.pesoKg.trim() !== '' && Number(value.pesoKg.replace(',', '.')) > 0);
  const reached = targetSeconds !== null && clock.seconds >= targetSeconds;
  const fraction = targetSeconds ? Math.min(1, clock.seconds / targetSeconds) : 0;
  // Escala en vez de ancho: al correr el cronómetro avanza segundo a segundo
  // y animar el ancho forzaría recalcular layout. Con `scaleX` y `transformOrigin: 'left'`
  // la interpolación ocurre en el compositor de GPU.
  const fill = useAnimatedStyle(() => {
    const ratio = Math.min(1, Math.max(0, fraction));
    return { transform: [{ scaleX: reduceMotion ? ratio : withTiming(ratio, { duration: 900 }) }] };
  }, [fraction, reduceMotion]);

  return (
    <View style={{ gap: spacing.md }} testID="timed-set-inputs">
      <View style={{ gap: spacing.smd, padding: spacing.md, borderRadius: radii.xxl, borderCurve: 'continuous', backgroundColor: colors.surfaceLow }}>
        <Stepper
          icon="stopwatch-outline"
          label="Segundos"
          metric="time"
          onChangeText={(duracionSeg) => onChange({ ...value, duracionSeg })}
          onStep={(direction) => onChange({ ...value, duracionSeg: bumpSeconds(value.duracionSeg, direction * 5) })}
          spoken="segundos, de cinco en cinco"
          testID="set-seconds"
          value={value.duracionSeg}
        />
        <PressableScale
          accessibilityHint="Mide la serie y escribe los segundos"
          accessibilityLabel={clock.running ? `Parar el cronómetro, ${clock.seconds} segundos` : 'Iniciar el cronómetro'}
          haptic="selection"
          onPress={toggle}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.smd,
            height: TIMER_HEIGHT,
            paddingHorizontal: spacing.md,
            borderRadius: radii.xl,
            borderCurve: 'continuous',
            overflow: 'hidden',
            backgroundColor: colors.surfaceHighest,
          }}
          testID="set-timer"
        >
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: '100%',
                transformOrigin: 'left',
                backgroundColor: reached ? metricColors.rest.tint : metricColors.time.tint,
              },
              fill,
            ]}
          />
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: radii.full,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: reached ? metricColors.rest.edge : metricColors.time.edge,
            }}
          >
            <Ionicons color={reached ? metricColors.rest.ink : metricColors.time.ink} name={clock.running ? 'stop' : 'play'} size={iconSizes.md} />
          </View>
          <Text strong style={{ flex: 1 }} variant="headline">
            {clock.running ? (reached ? '¡Objetivo! Parar' : 'Parar') : clock.seconds > 0 ? 'Volver a medir' : 'Cronómetro'}
          </Text>
          <Text accessibilityLiveRegion="polite" strong tabular testID="set-timer-clock" variant="headline">
            {target ? `${elapsed} / ${target}` : elapsed}
          </Text>
        </PressableScale>
        {loaded ? (
          <>
            <View style={{ height: 1, backgroundColor: colors.border }} />
            <Stepper
              decimal
              icon="barbell-outline"
              label="Lastre"
              metric="weight"
              onChangeText={(pesoKg) => onChange({ ...value, pesoKg })}
              onStep={(direction) => onChange({ ...value, pesoKg: bumpKg(value.pesoKg, direction * 2.5) })}
              spoken="kilos de lastre"
              testID="set-weight"
              unit="kg"
              value={value.pesoKg}
            />
          </>
        ) : (
          <PressableScale
            accessibilityLabel="Añadir lastre"
            haptic="selection"
            onPress={() => setLoaded(true)}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, minHeight: minTouchTarget }}
            testID="add-load"
          >
            <Ionicons color={metricColors.weight.ink} name="add-circle-outline" size={iconSizes.sm} />
            <Text tone="secondary" variant="footnote">
              Añadir lastre
            </Text>
          </PressableScale>
        )}
      </View>

      {lastTime ? (
        <PressableScale
          accessibilityHint="Rellena los segundos"
          accessibilityLabel={`La última vez, ${lastTime.when}: ${lastTime.seconds} segundos`}
          haptic="selection"
          onPress={() => onChange({ ...value, duracionSeg: String(lastTime.seconds) })}
          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: minTouchTarget }}
          testID="last-time"
        >
          <Ionicons color={metricColors.time.ink} name="time-outline" size={iconSizes.sm} />
          <Text style={{ flex: 1 }} tone="secondary" variant="subhead">
            {'La última vez: '}
            <Text strong tabular variant="subhead">
              {secondsLabel(lastTime.seconds)}
            </Text>
          </Text>
          <Text tone="muted" variant="footnote">
            {lastTime.when}
          </Text>
        </PressableScale>
      ) : null}
    </View>
  );
}
