import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { Text } from '@/components/text';
import { colors, iconSizes, radii, spacing } from '@/theme';

export type Fact = {
  key: string;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
};

/**
 * Hechos de un vistazo («4 días/sem», «8 semanas», «≈55 min»). Píldoras
 * neutras: informan, no se tocan, y por eso no llevan acento.
 */
export function FactChips({ facts }: { facts: readonly Fact[] }) {
  if (facts.length === 0) return null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
      {facts.map((fact) => (
        <View
          key={fact.key}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.xs,
            minHeight: 32,
            paddingHorizontal: spacing.smd,
            borderRadius: radii.full,
            backgroundColor: colors.surfaceHighest,
          }}
        >
          {fact.icon ? (
            <Ionicons
              accessibilityElementsHidden
              color={colors.textSecondary}
              importantForAccessibility="no-hide-descendants"
              name={fact.icon}
              size={iconSizes.sm}
            />
          ) : null}
          <Text tabular tone="secondary" variant="footnote">
            {fact.label}
          </Text>
        </View>
      ))}
    </View>
  );
}
