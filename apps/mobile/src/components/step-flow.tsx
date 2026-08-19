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
import { colors, fontSizes, iconSizes, radii, semibold, spacing } from '@/theme';

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
 * The dates of a renewal, as a vertical timeline.
 *
 * They used to be three calendar leaves side by side joined by arrows. Three
 * 88pt leaves plus two bridges need 304pt before any gap, and a phone card has
 * about 306pt of usable width: the row fit only by having nothing left over,
 * which is exactly the «everything is glued together» reading. Stacking them
 * also matches what the content is — a sequence in time, which people picture
 * as a line going down, not across — and buys each entry a full line for its
 * caption instead of two cramped centred words.
 */
export function DateTimeline({
  items,
}: {
  items: readonly {
    iso: string;
    caption: string;
    icon: keyof typeof Ionicons.glyphMap;
    accent?: boolean;
  }[];
}) {
  const format = new Intl.DateTimeFormat('es', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return (
    <View style={{ gap: 0 }}>
      {items.map((item, index) => {
        const date = new Date(item.iso);
        const valid = !Number.isNaN(date.getTime());
        const last = index === items.length - 1;
        return (
          <View key={item.caption} style={{ flexDirection: 'row', gap: spacing.md }}>
            {/* Rail: the dot marks the moment, the line carries «and then». */}
            <View style={{ alignItems: 'center', width: iconSizes.lg }}>
              <View
                style={{
                  width: iconSizes.lg,
                  height: iconSizes.lg,
                  borderRadius: radii.full,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: item.accent ? colors.volt : colors.border,
                  backgroundColor: item.accent ? colors.volt : colors.surfaceHigh,
                }}
              >
                <Ionicons
                  color={item.accent ? colors.background : colors.textMuted}
                  name={item.icon}
                  size={14}
                />
              </View>
              {last ? null : (
                <View style={{ flex: 1, width: 1, backgroundColor: colors.border }} />
              )}
            </View>
            <View style={{ flex: 1, paddingBottom: last ? 0 : spacing.md, gap: 2 }}>
              <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>
                {item.caption}
              </Text>
              <Text
                style={{
                  color: item.accent ? colors.text : colors.textMuted,
                  fontSize: fontSizes.md,
                  fontWeight: semibold,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {valid ? format.format(date) : '—'}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}
