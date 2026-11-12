import { Image } from 'expo-image';
import { ScrollView, StyleSheet, View } from 'react-native';
import { MARKETPLACE_CATEGORIES, type MarketplaceCategoryId } from '@gymsheet/domain';
import { PressableScale } from '@/components/motion';
import { Text } from '@/components/text';
import { colors, fontSizes, radii, spacing } from '@/theme';
import { CATEGORY_IMAGES } from './category-images';

const TILE = 76;

/**
 * Fila de categorías con icono 3D: baldosas grandes con la etiqueta debajo,
 * como el selector de comida de una app de delivery. La elegida lleva borde
 * pleno y etiqueta en negrita (forma, no solo color).
 */
export function CategoryTiles({
  value,
  onChange,
}: {
  value: MarketplaceCategoryId;
  onChange: (next: MarketplaceCategoryId) => void;
}) {
  return (
    <ScrollView
      contentContainerStyle={{ gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.xs }}
      horizontal
      showsHorizontalScrollIndicator={false}
    >
      {MARKETPLACE_CATEGORIES.map((category) => {
        const selected = category.id === value;
        return (
          <PressableScale
            accessibilityLabel={category.label}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            haptic="selection"
            key={category.id}
            onPress={() => onChange(category.id)}
            scaleTo={0.95}
            style={{ alignItems: 'center', gap: 6, width: TILE + 8 }}
          >
            <View
              style={{
                width: TILE,
                height: TILE,
                borderRadius: radii.xl,
                borderCurve: 'continuous',
                overflow: 'hidden',
                borderWidth: selected ? 2 : StyleSheet.hairlineWidth,
                borderColor: selected ? colors.text : colors.border,
                backgroundColor: colors.surfaceLow,
              }}
            >
              <Image contentFit="cover" source={CATEGORY_IMAGES[category.id]} style={{ width: '100%', height: '100%' }} />
            </View>
            <Text
              numberOfLines={1}
              style={{
                color: selected ? colors.text : colors.textMuted,
                fontSize: fontSizes.xs,
                fontWeight: selected ? '700' : '500',
              }}
            >
              {category.label}
            </Text>
          </PressableScale>
        );
      })}
    </ScrollView>
  );
}
