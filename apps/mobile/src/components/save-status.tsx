import { Ionicons } from '@expo/vector-icons';
import { useMutationState, type MutationKey } from '@tanstack/react-query';
import { saveStatusLabel, sectionSaveStatus, type SaveStatus } from '@gymsheet/domain';
import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { DURATION } from '@/components/motion';
import { Text } from '@/components/text';
import { useReduceMotion } from '@/notifications/use-reduce-motion';
import { accentPolicy, colors, iconSizes, spacing } from '@/theme';

/**
 * The last save of a section, read from the mutation cache by key, so it
 * survives the remount that a new server value causes (`key={bio}`).
 */
export function useSectionSave(mutationKey: MutationKey, dirty: boolean): SaveStatus {
  const statuses = useMutationState({ filters: { mutationKey }, select: (mutation) => mutation.state.status });
  return sectionSaveStatus({ dirty, mutation: statuses[statuses.length - 1] });
}

const ICON: Partial<Record<SaveStatus, keyof typeof Ionicons.glyphMap>> = {
  saved: 'checkmark-circle-outline', // same outline check as the web (lucide CircleCheck)
  failed: 'alert-circle-outline',
  dirty: 'ellipse',
};

/**
 * The edit screen's single save language (both platforms): the line beside a
 * section's save says whether it has unsaved changes, is saving, was saved, or
 * failed — in place, announced politely. Each change of state fades in (the
 * answer to «¿me hizo caso?»); nothing moves on its own.
 */
export function SaveStatusLine({ status, saved, testID }: { status: SaveStatus; saved: string; testID?: string }) {
  const reduceMotion = useReduceMotion();
  const label = saveStatusLabel(status, saved);
  const tint = status === 'saved' ? accentPolicy.ink : status === 'failed' ? colors.danger : colors.textMuted;
  const icon = ICON[status];
  return (
    <View accessibilityLiveRegion="polite" accessibilityRole="text" style={{ flex: 1, minHeight: iconSizes.md }} testID={testID}>
      {label ? (
        <Animated.View entering={reduceMotion ? undefined : FadeIn.duration(DURATION.quick)} key={status} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          {icon ? <Ionicons color={tint} name={icon} size={status === 'dirty' ? spacing.sm : iconSizes.sm} /> : null}
          <Text style={{ color: tint, flexShrink: 1 }} variant="footnote">{label}</Text>
        </Animated.View>
      ) : null}
    </View>
  );
}
