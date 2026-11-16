import { Ionicons } from '@expo/vector-icons';
import type { ProfileCompletion } from '@gymsheet/schemas';
import { completeCardMode, noOrphan, profileCompleteCopy } from '@gymsheet/domain';
import { View } from 'react-native';
import { Card } from '@/components/layout';
import { PressableScale } from '@/components/motion';
import { Text } from '@/components/text';
import { accentPolicy, colors, iconSizes, minTouchTarget, radii, spacing } from '@/theme';

/**
 * 100 %: the nudge becomes a quiet reward, said once. The first time, a card —
 * a full check in accent ink, what completing it earned and the way to see the
 * result. On later visits it collapses to one quiet line with the same way to
 * the preview, so a finished profile stops asking for attention.
 */
export function CompletionDone({ completion, onPress, seenBefore }: { completion: ProfileCompletion; onPress: () => void; seenBefore: boolean | undefined }) {
  const copy = profileCompleteCopy(completion);
  const mode = completeCardMode(completion.percent, seenBefore);
  if (!copy || mode === 'none' || mode === 'pending') return null;
  if (mode === 'quiet') {
    return (
      <PressableScale
        accessibilityHint="Ver tu vista previa"
        accessibilityLabel={`${copy.title}. Ver cómo te ven`}
        haptic="light"
        onPress={onPress}
        style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: minTouchTarget, alignSelf: 'flex-start' }}
        testID="profile-complete-quiet"
      >
        <Ionicons color={accentPolicy.ink} name="checkmark-circle" size={iconSizes.sm} />
        <Text style={{ flexShrink: 1 }} tone="secondary" variant="subhead">
          {noOrphan(`${copy.title} · Ver cómo te ven`)}
        </Text>
        <Ionicons color={colors.textMuted} name="chevron-forward" size={iconSizes.sm} />
      </PressableScale>
    );
  }
  return (
    <Card>
      <PressableScale accessibilityHint="Ver tu vista previa" accessibilityLabel={`${copy.title}. ${copy.body}`} onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.smd, minHeight: minTouchTarget }} testID="profile-complete">
        <View style={{ width: minTouchTarget, height: minTouchTarget, borderRadius: radii.full, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceHighest }}>
          <Ionicons color={accentPolicy.ink} name="checkmark-circle" size={iconSizes.lg} />
        </View>
        <View style={{ flex: 1, gap: spacing.xxs }}>
          <Text accessibilityRole="header" variant="headline">{copy.title}</Text>
          <Text tone="secondary" variant="footnote">{noOrphan(copy.body)}</Text>
        </View>
        <Ionicons color={colors.textMuted} name="chevron-forward" size={iconSizes.sm} />
      </PressableScale>
    </Card>
  );
}
