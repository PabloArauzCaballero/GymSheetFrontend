import { Ionicons } from '@expo/vector-icons';
import { freezeRuleLabel, streakMilestoneLabel, streakSummary } from '@gymsheet/domain';
import type { PointRules, ProgressionStreak } from '@gymsheet/schemas';
import { Text, View } from 'react-native';
import { Card } from '@/components/layout';
import { ProgressTrack } from '@/components/progression';
import { alpha, cardMaterials, colors, fontSizes, iconSizes, metricColors, radii, semibold, spacing } from '@/theme';

/** Los hitos de racha con carta propia (contrato 12, P3). */
const MILESTONES = [3, 7, 14, 30, 60, 100, 200, 365] as const;

/**
 * La racha con sus comodines: «12 días · 1 comodín» y cuánto falta para el
 * próximo hito. Nunca culpa: una racha en cero invita a empezar hoy.
 */
export function StreakCard({ streak, rules }: { streak: ProgressionStreak; rules?: PointRules }) {
  const flame = metricColors.streak;
  const ice = cardMaterials.RARA.label;
  const milestone = streakMilestoneLabel(streak);
  const previous = [...MILESTONES].reverse().find((value) => value <= streak.current) ?? 0;
  const ratio =
    streak.nextMilestone !== null && streak.nextMilestone > previous
      ? (streak.current - previous) / (streak.nextMilestone - previous)
      : 1;
  const maxFreezes = rules?.maxFreezes ?? 2;

  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: radii.full,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: flame.tint,
          }}
        >
          <Ionicons color={flame.ink} name="flame" size={iconSizes.lg} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ color: colors.text, fontSize: fontSizes.lg, fontWeight: semibold, fontVariant: ['tabular-nums'] }}>
            {streakSummary(streak)}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>
            {`Tu mejor racha: ${streak.longest} ${streak.longest === 1 ? 'día' : 'días'}`}
          </Text>
        </View>
        {/* Los comodines guardados, como fichas: se ve cuántos caben y cuántos tienes. */}
        <View
          accessibilityLabel={`${streak.freezes} de ${maxFreezes} comodines guardados`}
          accessible
          style={{ flexDirection: 'row', gap: spacing.xs }}
        >
          {Array.from({ length: maxFreezes }, (_, index) => {
            const has = index < streak.freezes;
            return (
              <View
                key={index}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: radii.sm,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: has ? alpha(ice, 0.5) : colors.borderSubtle,
                  backgroundColor: has ? alpha(ice, 0.14) : 'transparent',
                }}
              >
                <Ionicons color={has ? ice : colors.textDisabled} name="snow" size={iconSizes.sm} />
              </View>
            );
          })}
        </View>
      </View>

      {milestone ? (
        <View style={{ gap: spacing.xs }}>
          <ProgressTrack color={flame.ink} height={6} ratio={ratio} />
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>{milestone}</Text>
        </View>
      ) : null}

      <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs, lineHeight: 18 }}>
        {streak.current === 0
          ? 'Tu racha está en cero. Un entrenamiento hoy y vuelve a contar.'
          : streak.freezesUsed > 0
            ? `Esta racha ya usó ${streak.freezesUsed} ${streak.freezesUsed === 1 ? 'comodín' : 'comodines'}. ${freezeRuleLabel(rules ?? {})}`
            : freezeRuleLabel(rules ?? {})}
      </Text>
    </Card>
  );
}
