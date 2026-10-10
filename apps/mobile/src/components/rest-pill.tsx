import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { Text } from '@/components/text';
import { colors, iconSizes, spacing } from '@/theme';

/** `150` → «2:30»; `45` → «45 s». */
export function formatRest(seconds: number): string {
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

/**
 * El descanso entre bloques (C8.2): una fila fina con la línea punteada a los
 * lados y «Descanso 2:30» en texto secundario tabular. Separa sin ser una
 * tarjeta más y no es tocable en la vista del plan.
 */
export function RestPill({ seconds, suffix }: { seconds: number; suffix?: string }) {
  const label = `Descanso ${formatRest(seconds)}${suffix ? ` ${suffix}` : ''}`;
  return (
    <View
      accessibilityLabel={label}
      accessible
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs }}
    >
      <View style={{ flex: 1, borderTopWidth: 1, borderStyle: 'dashed', borderColor: colors.border }} />
      <Ionicons
        accessibilityElementsHidden
        color={colors.textMuted}
        importantForAccessibility="no-hide-descendants"
        name="timer-outline"
        size={iconSizes.sm}
      />
      <Text tabular tone="secondary" variant="footnote">
        {label}
      </Text>
      <View style={{ flex: 1, borderTopWidth: 1, borderStyle: 'dashed', borderColor: colors.border }} />
    </View>
  );
}
