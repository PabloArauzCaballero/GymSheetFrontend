import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';
import type { TrainingGoal } from '@gymsheet/types';
import { Text } from '@/components/text';
import { GOAL_LABEL } from '@/lib/format';
import { accentContrast, accentPolicy, colors, iconSizes, minTouchTarget, radii, spacing } from '@/theme';

/** One goal chip. Chips beat a native picker here: seven options, all visible. */
export function GoalOption({ goal, selected, onSelect }: { goal: TrainingGoal; selected: boolean; onSelect: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      // `selected` is what a screen reader announces for a chip group; without
      // it the volt fill is the only cue, which is no cue at all when unseen.
      accessibilityState={{ selected }}
      onPress={onSelect}
      style={({ pressed }) => ({
        justifyContent: 'center',
        minHeight: minTouchTarget,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: selected ? colors.volt : colors.border,
        backgroundColor: selected ? colors.volt : colors.surface,
        paddingHorizontal: spacing.md,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <Text strong style={{ color: selected ? accentContrast() : colors.text }} variant="subhead">
        {GOAL_LABEL[goal]}
      </Text>
    </Pressable>
  );
}

export function StepHeading({ icon, question, hint }: { icon: keyof typeof Ionicons.glyphMap; question: string; hint: string }) {
  return (
    <View style={{ alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.sm }}>
      <Ionicons color={accentPolicy.glyph} name={icon} size={iconSizes.xl} />
      <Text style={{ textAlign: 'center' }} variant="title">
        {question}
      </Text>
      <Text style={{ textAlign: 'center' }} tone="muted" variant="subhead">
        {hint}
      </Text>
    </View>
  );
}
