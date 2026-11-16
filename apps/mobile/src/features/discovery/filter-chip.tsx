import { Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PressableScale } from '@/components/motion';
import { alpha, colors, fontSizes, iconSizes, radii, spacing } from '@/theme';

export function FilterChip({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: spacing.md,
        paddingVertical: 8,
        borderRadius: radii.full,
        borderWidth: active ? 1.5 : 1,
        borderColor: active ? colors.volt : colors.borderSubtle,
        backgroundColor: active ? alpha(colors.volt, 0.16) : colors.surfaceHigh,
      }}
    >
      <Ionicons color={active ? colors.volt : colors.textMuted} name={icon} size={iconSizes.sm} />
      <Text style={{ color: active ? colors.text : colors.textMuted, fontSize: fontSizes.sm, fontWeight: active ? '700' : '500' }}>
        {label}
      </Text>
      {active && <Ionicons color={colors.volt} name="checkmark" size={14} style={{ marginLeft: 2 }} />}
    </PressableScale>
  );
}
