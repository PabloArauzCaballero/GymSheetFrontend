import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { clockLabel, secondsLabel } from '@gymsheet/hooks';
import { PressableScale } from '@/components/motion';
import { Text } from '@/components/text';
import { useStopwatch } from '@/features/cardio/use-stopwatch';
import { Chip, Field, type SetDraft } from '@/features/workout/set-inputs';
import { bumpSeconds, MAX_TIMED_SET_SEC } from '@/features/workout/workout-flow';
import { colors, comfortableTouchTarget, iconSizes, minTouchTarget, radii, spacing } from '@/theme';

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

  return (
    <View style={{ gap: spacing.smd }} testID="timed-set-inputs">
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Field
          label="Segundos"
          onChange={(duracionSeg) => onChange({ ...value, duracionSeg })}
          suffix="s"
          testID="set-seconds"
          value={value.duracionSeg}
        />
        <Field
          decimal
          label="Lastre"
          onChange={(pesoKg) => onChange({ ...value, pesoKg })}
          suffix="kg"
          testID="set-weight"
          value={value.pesoKg}
        />
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        <Chip label="−5 s" onPress={() => onChange({ ...value, duracionSeg: bumpSeconds(value.duracionSeg, -5) })} spoken="Cinco segundos menos" />
        <Chip label="+5 s" onPress={() => onChange({ ...value, duracionSeg: bumpSeconds(value.duracionSeg, 5) })} spoken="Cinco segundos más" />
      </View>

      <PressableScale
        accessibilityHint="Mide la serie y escribe los segundos"
        accessibilityLabel={clock.running ? `Parar el cronómetro, ${clock.seconds} segundos` : 'Iniciar el cronómetro'}
        haptic="selection"
        onPress={toggle}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          minHeight: comfortableTouchTarget,
          paddingHorizontal: spacing.md,
          borderRadius: radii.md,
          borderCurve: 'continuous',
          backgroundColor: colors.surfaceHigh,
        }}
        testID="set-timer"
      >
        <Ionicons color={colors.text} name={clock.running ? 'stop' : 'play'} size={iconSizes.md} />
        <Text strong style={{ flex: 1 }} variant="headline">
          {clock.running ? 'Parar' : clock.seconds > 0 ? 'Volver a medir' : 'Cronómetro'}
        </Text>
        <Text accessibilityLiveRegion="polite" strong tabular testID="set-timer-clock" variant="headline">
          {target ? `${elapsed} / ${target}` : elapsed}
        </Text>
      </PressableScale>

      {lastTime ? (
        <PressableScale
          accessibilityHint="Rellena los segundos"
          accessibilityLabel={`Última vez, ${lastTime.when}: ${lastTime.seconds} segundos`}
          haptic="selection"
          onPress={() => onChange({ ...value, duracionSeg: String(lastTime.seconds) })}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            minHeight: minTouchTarget,
            paddingHorizontal: spacing.smd,
            borderRadius: radii.md,
            backgroundColor: colors.surface,
          }}
          testID="last-time"
        >
          <Ionicons color={colors.textSecondary} name="time-outline" size={iconSizes.sm} />
          <Text style={{ flex: 1 }} tone="secondary" variant="subhead">
            {'Última vez: '}
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
