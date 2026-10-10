import { Ionicons } from '@expo/vector-icons';
import { PressableScale } from '@/components/motion';
import { Text } from '@/components/text';
import { colors, iconSizes, minTouchTarget, radii, spacing } from '@/theme';

/**
 * Chip de filtro (C8.1: nunca en acento). Lo elegido se distingue por relleno,
 * contorno de control (≥ 3:1) y un ✓ —la forma, no solo el color— y se anuncia
 * con `selected`. Alto táctil de 44 también en web, donde `hitSlop` no existe.
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
      onPress={onPress}
      scaleTo={0.96}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        minHeight: minTouchTarget,
        paddingHorizontal: spacing.smd,
        borderRadius: radii.full,
        borderWidth: 1,
        borderColor: selected ? colors.borderControl : colors.border,
        backgroundColor: selected ? colors.surfaceHighest : 'transparent',
      }}
      testID={testID}
    >
      {glyph ? (
        <Ionicons
          accessibilityElementsHidden
          color={selected ? colors.text : colors.textMuted}
          importantForAccessibility="no-hide-descendants"
          name={glyph}
          size={iconSizes.sm}
        />
      ) : null}
      <Text strong={selected} tone={selected ? 'default' : 'secondary'} variant="subhead">
        {label}
      </Text>
    </PressableScale>
  );
}
