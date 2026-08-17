import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, Text } from 'react-native';
import { colors, fontSizes, iconSizes, minTouchTarget, spacing } from '@/theme';

/**
 * Explicit way back from a detail screen. Android has the system back gesture
 * and iOS the edge swipe, but a visible control is the only affordance that
 * works for everyone — including screen reader users, for whom a swipe-only
 * path is no path at all.
 */
export function BackLink({ label = 'Volver' }: { label?: string }) {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={spacing.sm}
      onPress={() => router.back()}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: spacing.xs,
        minHeight: minTouchTarget,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Ionicons
        accessibilityElementsHidden
        color={colors.volt}
        importantForAccessibility="no-hide-descendants"
        name="chevron-back"
        size={iconSizes.md}
      />
      <Text style={{ color: colors.volt, fontSize: fontSizes.sm, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}
