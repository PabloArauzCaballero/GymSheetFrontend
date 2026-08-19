import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { colors, fontSizes, minTouchTarget, radii, spacing } from '@/theme';
import { Button } from '@/components/ui';
import { DURATION, PREMIUM_EASING, PressableScale } from '@/components/motion';

/**
 * Rest timer between sets. The phone is lying on a bench two metres away and the
 * user is mid-effort, so the remaining time *is* the interface: one oversized
 * tabular number, a bar that drains under it, and controls big enough to hit
 * without looking.
 *
 * Timing is deadline-based rather than decremental. Subtracting one second per
 * `setInterval` tick drifts by whole seconds over a 3-minute rest (JS timers
 * fire late, and the OS throttles them when the screen dims), which is exactly
 * the interval people actually time. Instead we store the target timestamp and
 * derive the remainder from the clock on every tick, so a late or coalesced tick
 * costs nothing.
 */

/** Tick fast enough that the displayed second is never visibly stale. */
const TICK_MS = 250;

/** Quick-add chips: the two amounts people reach for when a set went badly. */
const QUICK_ADDS = [15, 30] as const;

/** Optical tightening for the display number; ~-4% at this size. */
const TIME_LETTER_SPACING = fontSizes['2xl'] * -0.04;

/** `M:SS`, rounded up so the last visible second is a full second of rest. */
function formatTime(remainingMs: number): string {
  const totalSeconds = Math.ceil(Math.max(0, remainingMs) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/** Spoken form — screen readers should not read "cero dos puntos cero cero". */
function speakTime(remainingMs: number): string {
  const totalSeconds = Math.ceil(Math.max(0, remainingMs) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `Quedan ${seconds} segundos`;
  return `Quedan ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'} y ${seconds} segundos`;
}

export function RestTimer({
  seconds,
  onDone,
  autoStart = false,
}: {
  seconds: number;
  onDone?: () => void;
  /** Counts down from the moment it appears, without waiting for a tap. */
  autoStart?: boolean;
}) {
  const initialMs = Math.max(0, Math.round(seconds * 1000));
  const [totalMs, setTotalMs] = useState(initialMs);
  const [remainingMs, setRemainingMs] = useState(initialMs);
  const [running, setRunning] = useState(false);
  const [trackWidth, setTrackWidth] = useState(0);

  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(1);

  /** Absolute end time while running; `null` while paused. */
  const deadlineRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  /** Latches so a countdown reports completion exactly once. */
  const doneRef = useRef(false);
  /** Kept in a ref so a re-rendered parent callback never restarts the timer. */
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const clearTick = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Unmount must not leave a timer running: the screen can be popped mid-rest.
  useEffect(() => clearTick, [clearTick]);

  const finish = useCallback(() => {
    clearTick();
    deadlineRef.current = null;
    setRunning(false);
    setRemainingMs(0);
    if (doneRef.current) return;
    doneRef.current = true;
    // A success pattern, not a plain buzz: it has to be identifiable through a
    // pocket or against a bench without looking at the screen.
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onDoneRef.current?.();
  }, [clearTick]);

  /** The single path into a live tick: counts down to `ms` from right now. */
  const beginCountdown = useCallback(
    (ms: number) => {
      if (ms <= 0) return;
      deadlineRef.current = Date.now() + ms;
      setRunning(true);
      clearTick();
      intervalRef.current = setInterval(() => {
        const deadline = deadlineRef.current;
        if (deadline === null) return;
        const next = deadline - Date.now();
        if (next <= 0) {
          finish();
          return;
        }
        setRemainingMs(next);
      }, TICK_MS);
    },
    [clearTick, finish],
  );

  const start = useCallback(() => beginCountdown(remainingMs), [beginCountdown, remainingMs]);

  // A new rest duration is a new countdown, not an adjustment of the current one.
  useEffect(() => {
    clearTick();
    deadlineRef.current = null;
    doneRef.current = false;
    setTotalMs(initialMs);
    setRemainingMs(initialMs);
    progress.value = 1;
    // The set is over the moment it is logged, so the rest counts itself down.
    // Waiting for a tap means the clock only starts when the user happens to
    // look at the screen — which is precisely when they are not looking at it.
    if (autoStart) {
      beginCountdown(initialMs);
      return;
    }
    setRunning(false);
  }, [autoStart, beginCountdown, clearTick, initialMs, progress]);

  const pause = useCallback(() => {
    const deadline = deadlineRef.current;
    clearTick();
    deadlineRef.current = null;
    setRunning(false);
    // Freeze on the clock-derived remainder, not on the last rendered value, so
    // resuming does not silently donate up to one tick of rest.
    if (deadline !== null) setRemainingMs(Math.max(0, deadline - Date.now()));
  }, [clearTick]);

  const reset = useCallback(() => {
    clearTick();
    deadlineRef.current = null;
    doneRef.current = false;
    setTotalMs(initialMs);
    setRemainingMs(initialMs);
    setRunning(false);
  }, [clearTick, initialMs]);

  const addSeconds = useCallback((extra: number) => {
    const extraMs = extra * 1000;
    // Extra time is added to the total as well, otherwise the bar would refill
    // past full and stop describing the rest that is actually left.
    setTotalMs((prev) => prev + extraMs);
    if (deadlineRef.current !== null) {
      deadlineRef.current += extraMs;
      setRemainingMs(Math.max(0, deadlineRef.current - Date.now()));
      return;
    }
    setRemainingMs((prev) => {
      const next = prev + extraMs;
      // Topping up a finished countdown opens a new one, so it may complete again.
      if (next > 0) doneRef.current = false;
      return next;
    });
  }, []);

  // The bar follows the tick with a linear glide of exactly one tick, which
  // reads as continuous drainage instead of four steps per second.
  useEffect(() => {
    if (reduceMotion) return;
    const ratio = totalMs > 0 ? Math.min(1, Math.max(0, remainingMs / totalMs)) : 0;
    progress.value = withTiming(ratio, { duration: TICK_MS, easing: Easing.linear });
  }, [progress, reduceMotion, remainingMs, totalMs]);

  const fillStyle = useAnimatedStyle(() => ({
    // Translation instead of width: no layout pass per frame, and the fill stays
    // clipped by the track. Anchored left because rest drains from the end.
    transform: [{ translateX: -trackWidth * (1 - progress.value) }],
  }));

  const finished = remainingMs <= 0;
  const toggleLabel = running ? 'Pausar descanso' : finished ? 'Descanso terminado' : 'Iniciar descanso';

  // Reaching zero lights the card for a beat — a peripheral cue for someone who
  // is looking at the bar, not the number. Opacity only, so it costs nothing.
  const glow = useSharedValue(0);
  useEffect(() => {
    const target = finished ? 1 : 0;
    glow.value = reduceMotion
      ? target
      : withTiming(target, { duration: DURATION.standard, easing: PREMIUM_EASING });
  }, [finished, glow, reduceMotion]);

  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value * 0.08 }));

  return (
    <View
      style={{
        gap: spacing.md,
        padding: spacing.lg,
        borderRadius: radii.xl,
        borderWidth: 1,
        borderColor: finished ? colors.accentInk : colors.border,
        backgroundColor: colors.surfaceLow,
      }}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { borderRadius: radii.xl, backgroundColor: colors.volt },
          glowStyle,
        ]}
      />

      <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>Descanso</Text>

      <Text
        accessibilityLabel={speakTime(remainingMs)}
        accessibilityLiveRegion="polite"
        style={{
          color: finished ? colors.accentInk : colors.text,
          fontSize: fontSizes['2xl'],
          fontWeight: '600',
          letterSpacing: TIME_LETTER_SPACING,
          // Tabular figures keep the digits from shuffling sideways every second.
          fontVariant: ['tabular-nums'],
        }}
      >
        {formatTime(remainingMs)}
      </Text>

      {reduceMotion ? null : (
        <View
          onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
          style={{
            height: spacing.sm,
            borderRadius: radii.full,
            backgroundColor: colors.surfaceHigh,
            overflow: 'hidden',
          }}
        >
          <Animated.View
            style={[
              {
                width: '100%',
                height: '100%',
                borderRadius: radii.full,
                backgroundColor: finished ? colors.accentInk : colors.volt,
              },
              fillStyle,
            ]}
          />
        </View>
      )}

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {QUICK_ADDS.map((extra) => (
          <PressableScale
            accessibilityLabel={`Añadir ${extra} segundos`}
            key={extra}
            onPress={() => addSeconds(extra)}
            style={{
              flex: 1,
              minHeight: minTouchTarget,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: radii.md,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
            }}
          >
            <Text
              style={{
                color: colors.text,
                fontSize: fontSizes.md,
                fontWeight: '600',
                fontVariant: ['tabular-nums'],
              }}
            >
              {`+${extra}s`}
            </Text>
          </PressableScale>
        ))}
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Button
          disabled={finished}
          label={toggleLabel}
          onPress={running ? pause : start}
          style={{ flex: 2 }}
          variant="primary"
        />
        <Button label="Reiniciar" onPress={reset} style={{ flex: 1 }} variant="ghost" />
      </View>
    </View>
  );
}
