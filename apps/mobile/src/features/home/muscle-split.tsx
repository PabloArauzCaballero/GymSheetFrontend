import { View } from 'react-native';
import type { TrainingSummary } from '@gymsheet/domain';
import { Card } from '@/components/layout';
import { Text } from '@/components/text';
import { accentPolicy, colors, radii, spacing } from '@/theme';

/**
 * Reparto de series por músculo esta semana: barras proporcionales al grupo
 * más trabajado (lo que se juzga es el desequilibrio). Cuatro como mucho.
 */
export function MuscleSplit({ week }: { week: TrainingSummary['thisWeek'] }) {
  const top = week.muscles[0]?.sets ?? 1;
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.sm }}>
        <Text variant="headline">Músculos de esta semana</Text>
        <Text tabular tone="muted" variant="footnote">
          {`${week.sets} series`}
        </Text>
      </View>
      {week.muscles.length === 0 ? (
        <Text tone="muted" variant="subhead">
          Aún no hay series esta semana. Lo que entrenes aparecerá aquí, repartido por músculo.
        </Text>
      ) : (
        <View style={{ gap: spacing.smd }}>
          {week.muscles.slice(0, 4).map((muscle) => (
            <View
              accessibilityLabel={`${muscle.name}: ${muscle.sets} series`}
              accessible
              key={muscle.name}
              style={{ gap: spacing.xs }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm }}>
                <Text numberOfLines={1} style={{ flex: 1 }} tone="secondary" variant="footnote">
                  {muscle.name}
                </Text>
                <Text strong tabular variant="footnote">
                  {muscle.sets}
                </Text>
              </View>
              <View style={{ height: spacing.xs + spacing.xxs, borderRadius: radii.full, backgroundColor: colors.surfaceHighest, overflow: 'hidden' }}>
                <View
                  style={{
                    height: '100%',
                    width: `${Math.max(6, (muscle.sets / top) * 100)}%`,
                    borderRadius: radii.full,
                    backgroundColor: accentPolicy.glyph,
                  }}
                />
              </View>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}
