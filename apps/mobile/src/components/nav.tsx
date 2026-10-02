import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Text } from 'react-native';
import { PressableScale } from '@/components/motion';
import { accentPolicy, fontSizes, iconSizes, minTouchTarget, semibold, spacing } from '@/theme';

/**
 * Explicit way back from a detail screen. Android has the system back gesture
 * and iOS the edge swipe, but a visible control is the only affordance that
 * works for everyone — including screen reader users, for whom a swipe-only
 * path is no path at all.
 */
export function BackLink({ label = 'Volver' }: { label?: string }) {
  const router = useRouter();
  return (
    // Volver sólo navega: sin háptico (un golpe en cada «atrás» acaba siendo
    // ruido) y con el hundimiento compartido, que es lo que hace que responda.
    <PressableScale
      haptic="none"
      hitSlop={spacing.sm}
      onPress={() => router.back()}
      scaleTo={0.94}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: spacing.xs,
        minHeight: minTouchTarget,
      }}
    >
      {/* Tono tranquilo, no el acento. Volver es cromo de navegación, no la
          acción por la que se entra en la pantalla; en una pantalla de detalle
          con su botón principal, un «Volver» del mismo color le disputa la
          atención al único control que debería tenerla. */}
      <Ionicons
        accessibilityElementsHidden
        color={accentPolicy.quietLink}
        importantForAccessibility="no-hide-descendants"
        name="chevron-back"
        size={iconSizes.md}
      />
      <Text
        style={{ color: accentPolicy.quietLink, fontSize: fontSizes.sm, fontWeight: semibold }}
      >
        {label}
      </Text>
    </PressableScale>
  );
}
