import { Image } from 'expo-image';
import { ScrollView, StyleSheet, View } from 'react-native';
import { MARKETPLACE_CATEGORIES, type MarketplaceCategoryId } from '@gymsheet/domain';
import { PressableScale } from '@/components/motion';
import { Text } from '@/components/text';
import { alpha, colors, fontSizes, radii, spacing } from '@/theme';
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
            {/* Profundidad: la elegida se eleva (2 pt) con un halo del acento; el resto queda
                apoyada con una sombra corta. Las transiciones las anima el estilo nativo. */}
            <View
              style={{
                width: TILE,
                height: TILE,
                borderRadius: radii.xl,
                borderCurve: 'continuous',
                transform: [{ translateY: selected ? -2 : 0 }],
                boxShadow: selected
                  ? `0 8px 18px ${alpha(colors.volt, 0.35)}`
                  : `0 3px 8px ${alpha(colors.background, 0.7)}`,
              }}
            >
              <View
                style={{
                  flex: 1,
                  borderRadius: radii.xl,
                  borderCurve: 'continuous',
                  overflow: 'hidden',
                  borderWidth: selected ? 2 : StyleSheet.hairlineWidth,
                  borderColor: selected ? colors.volt : alpha(colors.text, 0.1),
                  backgroundColor: colors.surfaceLow,
                }}
              >
                <Image contentFit="cover" source={CATEGORY_IMAGES[category.id]} style={{ width: '100%', height: '100%' }} />
              </View>
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
