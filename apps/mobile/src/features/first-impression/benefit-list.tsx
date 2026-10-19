import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { Text } from '@/components/text';
import { accentPolicy, iconSizes, spacing } from '@/theme';
import type { Benefit } from './copy';

/**
 * Lo que se lleva quien se registra, en tres filas cortas. El glifo va en tinta
 * de acento fina, no en relleno: el único relleno de la pantalla es el botón.
 */
export function BenefitList({ items }: { items: readonly Benefit[] }) {
  return (
    <View accessibilityRole="list" style={{ gap: spacing.sm, alignSelf: 'center' }}>
      {items.map((item) => (
        <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Ionicons
            accessibilityElementsHidden
            color={accentPolicy.ink}
            importantForAccessibility="no-hide-descendants"
            name={item.icon}
            size={iconSizes.md}
          />
          <Text tone="secondary" variant="subhead">
            {item.label}
          </Text>
        </View>
      ))}
    </View>
  );
}
