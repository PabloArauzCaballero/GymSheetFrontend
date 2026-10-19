import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { chatColors, colors, fontSizes, iconSizes, radii, semibold, spacing } from '@/theme';

/** «Hoy», «Ayer», «12 de octubre»: una píldora centrada sobre la trama, como en WhatsApp. */
export function DaySeparator({ label }: { label: string }) {
  return (
    <View accessibilityRole="header" style={{ alignItems: 'center', marginVertical: spacing.sm }}>
      <View style={{ paddingHorizontal: spacing.sm + 2, paddingVertical: 5, borderRadius: radii.md, backgroundColor: chatColors.floatingChip }}>
        <Text style={{ color: colors.textSecondary, fontSize: fontSizes.xs, fontWeight: semibold }}>{label}</Text>
      </View>
    </View>
  );
}

/** Avisos del sistema (mensajes temporales, entreno aceptado) en su propia píldora, sin autor. */
export function SystemNotice({ line, timer }: { line: string; timer: boolean }) {
  return (
    <View style={{ alignItems: 'center', marginVertical: spacing.sm, paddingHorizontal: spacing.lg }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.xs,
          maxWidth: '92%',
          paddingHorizontal: spacing.sm + 2,
          paddingVertical: 6,
          borderRadius: radii.md,
          backgroundColor: chatColors.floatingChip,
        }}
      >
        {timer ? <Ionicons color={colors.textMuted} name="timer-outline" size={iconSizes.sm} /> : null}
        <Text
          accessibilityLabel={line}
          accessibilityLiveRegion="polite"
          accessibilityRole="text"
          style={{ flexShrink: 1, color: colors.textSecondary, fontSize: fontSizes.xs, lineHeight: fontSizes.xs * 1.45, textAlign: 'center' }}
        >
          {line}
        </Text>
      </View>
    </View>
  );
}
