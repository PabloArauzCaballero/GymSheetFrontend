import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { DURATION, PREMIUM_EASING } from '@/components/motion';
import { colors, fontSizes, iconSizes, radii, spacing } from '@/theme';

export type FlowStep = {
  /** Short label under the rail — two words at most, it is a signpost. */
  readonly label: string;
  readonly icon: keyof typeof Ionicons.glyphMap;
};

/**
 * Progress rail for a multi-step flow.
 *
 * A single filling bar tells you how far along you are but not what is coming;
 * a row of numbered dots tells you what is coming but not how far. This does
 * both: the rail fills continuously while each stop carries the icon of the
 * step it represents, so the user can see that the next thing is a calendar and
 * the one after that is a payment before committing to anything.
 *
 * Steps already passed keep their icon rather than collapsing to a checkmark —
 * in a three-step flow the history is short enough to stay legible, and a row
 * of identical ticks loses the shape of the journey.
 */
export function StepProgress({
  steps,
  current,
}: {
  steps: readonly FlowStep[];
  current: number;
}) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(0);
  const target = steps.length > 1 ? current / (steps.length - 1) : 1;

  useEffect(() => {
    if (reduceMotion) {
      progress.value = target;
      return;
    }
    // Slower than a press and faster than a screen change: the bar is
    // confirming a decision the user just made, not transporting them.
    progress.value = withTiming(target, {
      duration: DURATION.standard,
      easing: PREMIUM_EASING,
    });
  }, [progress, reduceMotion, target]);

  const fill = useAnimatedStyle(() => ({
    // Scale rather than width: no layout pass per frame.
    transform: [{ scaleX: progress.value }],
  }));

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ height: 3, borderRadius: radii.full, backgroundColor: colors.surfaceHigh }}>
        <Animated.View
          style={[
            {
              height: '100%',
              width: '100%',
              borderRadius: radii.full,
              backgroundColor: colors.volt,
              // Anchored left so the bar grows from the start, not the middle.
              transformOrigin: 'left',
            },
            fill,
          ]}
        />
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {steps.map((step, index) => {
          const done = index <= current;
          return (
            <View
              key={step.label}
              style={{ alignItems: 'center', gap: 4, flex: 1 }}
            >
              <Ionicons
                color={done ? colors.volt : colors.textDisabled}
                name={step.icon}
                size={iconSizes.md}
              />
              <Text
                numberOfLines={1}
                style={{
                  color: done ? colors.text : colors.textDisabled,
                  fontSize: fontSizes.xs,
                  fontWeight: index === current ? '700' : '500',
                }}
              >
                {step.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/**
 * A date presented as a calendar leaf rather than as text.
 *
 * "16 oct" in a sentence is read and forgotten; the same date on a torn-off
 * calendar page is the thing people actually picture when they think about when
 * their membership dies. The month sits on its own tinted band because that is
 * how every physical calendar this is imitating is built.
 */
export function DateLeaf({
  iso,
  caption,
  accent = false,
}: {
  iso: string;
  caption: string;
  accent?: boolean;
}) {
  const date = new Date(iso);
  const valid = !Number.isNaN(date.getTime());
  const month = valid
    ? new Intl.DateTimeFormat('es', { month: 'short' }).format(date).replace('.', '').toUpperCase()
    : '—';
  const day = valid ? String(date.getDate()).padStart(2, '0') : '—';
  const year = valid ? String(date.getFullYear()) : '';

  return (
    <View style={{ alignItems: 'center', gap: spacing.xs, flex: 1 }}>
      <View
        style={{
          width: 88,
          borderRadius: radii.lg,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: accent ? colors.volt : colors.border,
          backgroundColor: colors.surface,
        }}
      >
        <View
          style={{
            paddingVertical: 4,
            alignItems: 'center',
            backgroundColor: accent ? colors.volt : colors.surfaceHigh,
          }}
        >
          <Text
            style={{
              color: accent ? colors.background : colors.textMuted,
              fontSize: fontSizes.xs,
              fontWeight: '600',
              letterSpacing: 1,
            }}
          >
            {month}
          </Text>
        </View>
        <View style={{ paddingVertical: spacing.sm, alignItems: 'center' }}>
          <Text
            style={{
              color: colors.text,
              fontSize: fontSizes['2xl'],
              fontWeight: '600',
              fontVariant: ['tabular-nums'],
            }}
          >
            {day}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>{year}</Text>
        </View>
      </View>
      <Text
        numberOfLines={2}
        style={{ color: colors.textMuted, fontSize: fontSizes.xs, textAlign: 'center' }}
      >
        {caption}
      </Text>
    </View>
  );
}

/**
 * The arrow between two leaves: reads as "and then", not as a decoration.
 *
 * No caption. Three leaves plus two bridges already fill a phone row, and a
 * word under each arrow overlapped the cards either side of it. The captions
 * under the leaves carry the meaning; the arrow only has to carry the order.
 */
export function DateBridge() {
  return (
    <View style={{ width: 20, alignItems: 'center', justifyContent: 'center', paddingTop: 34 }}>
      <Ionicons color={colors.accentInk} name="arrow-forward" size={iconSizes.sm} />
    </View>
  );
}
