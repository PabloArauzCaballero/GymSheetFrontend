import { Ionicons } from '@expo/vector-icons';
import { PressableScale } from '@/components/motion';
import { Text } from '@/components/text';
import { StyleSheet } from 'react-native';
import { colors, iconSizes, minTouchTarget, radii, shadows, spacing } from '@/theme';

/**
 * Chip de filtro (C8.1: nunca en acento). Lo elegido se invierte —relleno
 * claro con texto oscuro, 17:1— y lleva un ✓, así que se distingue por la forma
 * y no solo por el color; se anuncia con `selected`. Lo demás va en una
 * superficie suave con realce. 40 de alto con 2 de `hitSlop` arriba y abajo.
 */
export function FilterChip({
  label,
  selected,
  onPress,
  icon,
  accessibilityLabel,
  testID,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  accessibilityLabel?: string;
  testID?: string;
}) {
  const glyph = selected ? 'checkmark' : icon;
  return (
    <PressableScale
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      haptic="selection"
      hitSlop={{ top: 2, bottom: 2 }}
      onPress={onPress}
      scaleTo={0.96}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs + 2,
        minHeight: minTouchTarget - 4,
        paddingHorizontal: spacing.md,
        borderRadius: radii.full,
        borderCurve: 'continuous',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: selected ? colors.text : colors.border,
        backgroundColor: selected ? colors.text : colors.surfaceLow,
        boxShadow: selected ? undefined : shadows.e1,
      }}
      testID={testID}
    >
      {glyph ? (
        <Ionicons
          accessibilityElementsHidden
          color={selected ? colors.background : colors.textMuted}
          importantForAccessibility="no-hide-descendants"
          name={glyph}
          size={iconSizes.sm}
        />
      ) : null}
      <Text strong style={selected ? { color: colors.background } : undefined} tone="secondary" variant="subhead">
        {label}
      </Text>
    </PressableScale>
  );
}
