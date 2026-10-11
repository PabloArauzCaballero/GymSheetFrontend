import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { Card } from '@/components/layout';
import { Text } from '@/components/text';
import { colors, iconSizes, spacing, tones } from '@/theme';

export type ProgressFigure = {
  key: string;
  value: string;
  label: string;
  delta?: { label: string; direction: 'up' | 'down' | 'flat' } | null;
};

/**
 * Las tres cifras del progreso en una sola tarjeta y en columnas: el número a
 * 22 (rampa `numeric`), su etiqueta debajo y, si la hay, la comparación. En
 * vez de tres losetas a 34 pt, donde «11,2 t» no cabía en un tercio de 390.
 */
export function ProgressStrip({ figures }: { figures: readonly ProgressFigure[] }) {
  return (
    <Card style={{ flexDirection: 'row', gap: 0, paddingHorizontal: spacing.md }}>
      {figures.map((figure, index) => {
        const tone =
          figure.delta?.direction === 'up' ? tones.dark.success.text : colors.textMuted;
        return (
          <View
            accessibilityLabel={`${figure.label}: ${figure.value}${figure.delta ? `, ${figure.delta.label} frente a la semana pasada` : ''}`}
            accessible
            key={figure.key}
            style={{
              flex: 1,
              gap: spacing.xxs,
              paddingHorizontal: spacing.sm,
              borderLeftWidth: index === 0 ? 0 : 1,
              borderLeftColor: colors.border,
            }}
          >
            <Text adjustsFontSizeToFit minimumFontScale={0.7} numberOfLines={1} variant="numeric">
              {figure.value}
            </Text>
            <Text numberOfLines={2} tone="muted" variant="footnote">
              {figure.label}
            </Text>
            {figure.delta ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xxs }}>
                <Ionicons
                  color={tone}
                  name={figure.delta.direction === 'up' ? 'trending-up' : figure.delta.direction === 'down' ? 'trending-down' : 'remove'}
                  size={iconSizes.xs}
                />
                <Text strong style={{ color: tone }} tabular variant="caption">
                  {figure.delta.label}
                </Text>
              </View>
            ) : null}
          </View>
        );
      })}
    </Card>
  );
}
