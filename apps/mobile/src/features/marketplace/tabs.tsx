import { View } from 'react-native';
import { PressableScale } from '@/components/motion';
import { Text } from '@/components/text';
import { colors, spacing } from '@/theme';

export type MarketplaceTab = 'OFFERS' | 'ENTITIES';

const TABS: { id: MarketplaceTab; label: string }[] = [
  { id: 'OFFERS', label: 'Ofertas' },
  { id: 'ENTITIES', label: 'Tiendas' },
];

/** Dos pestañas de texto con subrayado: sin cápsulas ni iconos. */
export function MarketplaceTabs({ value, onChange }: { value: MarketplaceTab; onChange: (tab: MarketplaceTab) => void }) {
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: 'row', gap: spacing.lg, paddingHorizontal: spacing.lg }}>
      {TABS.map((tab) => {
        const selected = tab.id === value;
        return (
          <PressableScale
            key={tab.id}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            haptic="selection"
            hitSlop={{ top: 8, bottom: 8 }}
            onPress={() => onChange(tab.id)}
            style={{
              paddingVertical: spacing.sm,
              borderBottomWidth: 2,
              borderBottomColor: selected ? colors.text : 'transparent',
            }}
          >
            <Text strong={selected} tone={selected ? 'default' : 'muted'} variant="body">
              {tab.label}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}
