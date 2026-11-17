import { Ionicons } from '@expo/vector-icons';
import { gymBadgeLabel } from '@gymsheet/domain';
import type { GymBadge as Badge } from '@gymsheet/schemas';
import { View } from 'react-native';
import { Text } from '@/components/text';
import { colors, iconSizes, radii, spacing } from '@/theme';

/** «Socio de X» (ADR-0027): computed by the backend from a membership the person shows. Word plus icon. */
export function GymBadge({ badge }: { badge: Badge | null | undefined }) {
  const label = gymBadgeLabel(badge);
  if (!label) return null;
  return (
    <View
      accessibilityLabel={label}
      accessible
      style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: spacing.xs, paddingHorizontal: spacing.smd, paddingVertical: spacing.xxs, borderRadius: radii.full, backgroundColor: colors.surfaceHigh }}
      testID="gym-badge"
    >
      <Ionicons color={colors.textMuted} name="ribbon-outline" size={iconSizes.sm} />
      <Text numberOfLines={1} strong variant="caption">
        {label}
      </Text>
    </View>
  );
}
