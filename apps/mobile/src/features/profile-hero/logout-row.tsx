import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, View } from 'react-native';
import { PressableScale } from '@/components/motion';
import { Text } from '@/components/text';
import { colors, comfortableTouchTarget, iconSizes, spacing } from '@/theme';

/**
 * «Cerrar sesión» as the last row of «Tu cuenta»: destructive in tone (danger
 * ink, no fill), so it is findable without being the loudest thing on the
 * profile. The confirmation lives with the caller.
 */
export function LogoutRow({ onPress, pending }: { onPress: () => void; pending: boolean }) {
  return (
    <PressableScale
      accessibilityLabel="Cerrar sesión"
      accessibilityRole="button"
      accessibilityState={{ busy: pending, disabled: pending }}
      disabled={pending}
      haptic="none"
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.smd, minHeight: comfortableTouchTarget, paddingVertical: spacing.sm }}
      testID="logout-row"
    >
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: iconSizes.lg, alignItems: 'center' }}>
        {pending ? <ActivityIndicator color={colors.danger} size="small" /> : <Ionicons color={colors.danger} name="log-out-outline" size={iconSizes.md} />}
      </View>
      <Text style={{ flex: 1 }} tone="danger" variant="headline">
        Cerrar sesión
      </Text>
    </PressableScale>
  );
}
