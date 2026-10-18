import { nearestLabel } from '@gymsheet/domain';
import type { ProgressionBadge } from '@gymsheet/schemas';
import { Text, View } from 'react-native';
import { MiniRewardCard } from '@/components/cards/reward-card';
import { resolveIllustration } from '@/components/cards/resolve';
import { ProgressTrack } from '@/components/progression';
import { cardMaterials, colors, fontSizes, semibold, spacing } from '@/theme';

/**
 * «Lo más cerca»: las insignias que casi tienes (gradiente de meta). Una fila
 * por insignia con su carta apagada, la barra y «Te faltan 2 para Medio
 * centenar». Sin nada cerca, no se pinta.
 */
export function NearestList({
  badges,
  limit = 3,
  delayMs = 0,
}: {
  badges: readonly ProgressionBadge[];
  limit?: number;
  delayMs?: number;
}) {
  const shown = badges.filter((badge) => !badge.earned).slice(0, limit);
  if (shown.length === 0) return null;
  return (
    <View style={{ gap: spacing.sm }}>
      {shown.map((badge, index) => {
        const material = cardMaterials[badge.rarity];
        return (
          <View
            accessibilityLabel={`${nearestLabel(badge)}. ${badge.progressLabel ?? ''}`}
            accessible
            key={badge.code}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
          >
            <MiniRewardCard art={resolveIllustration(badge)} rarity={badge.rarity} state="pending" width={36} />
            <View style={{ flex: 1, gap: spacing.xs }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm }}>
                <Text numberOfLines={2} style={{ flex: 1, color: colors.text, fontSize: fontSizes.sm, fontWeight: semibold }}>
                  {nearestLabel(badge)}
                </Text>
                {badge.progressLabel ? (
                  <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs, fontVariant: ['tabular-nums'] }}>
                    {badge.progressLabel}
                  </Text>
                ) : null}
              </View>
              <ProgressTrack color={material.label} delayMs={delayMs + index * 90} height={4} ratio={badge.progress ?? 0} />
            </View>
          </View>
        );
      })}
    </View>
  );
}
