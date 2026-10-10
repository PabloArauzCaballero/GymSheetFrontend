import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { workoutService } from '@/api/services';
import { PressableScale } from '@/components/motion';
import { Text } from '@/components/text';
import { colors, iconSizes, radii, shadows, spacing } from '@/theme';
import { formatRestClock, useRestRemaining, useWorkoutStore, type ActiveWorkout } from '@/features/workout/workout-store';

/** Alto de la mini-barra y su separación con las pestañas (las pantallas lo reservan). */
export const ACTIVE_BAR_HEIGHT = 56;
export const ACTIVE_BAR_SPACE = ACTIVE_BAR_HEIGHT + spacing.sm * 2;

/**
 * La sesión abierta, para la mini-barra: la del store (la pantalla del
 * entreno la mantiene al día) y, en un arranque en frío, la que diga el
 * servidor. Si el servidor responde que no hay ninguna, no se enseña.
 */
export function useActiveWorkout(): ActiveWorkout | null {
  const active = useWorkoutStore((state) => state.active);
  const open = useQuery({
    queryKey: ['workouts', 'active'],
    queryFn: async () => {
      const page = await workoutService.list(5);
      return page.items.find((item) => item.estado === 'EN_PROGRESO') ?? null;
    },
    staleTime: 60_000,
  });
  if (open.isSuccess) {
    if (!open.data) return null;
    return active?.id === open.data.id ? active : { id: open.data.id, current: null, progress: null };
  }
  return active;
}

/**
 * Mini-barra persistente encima de las pestañas con un entreno abierto (C8.3
 * punto 9), como la de un reproductor: qué toca o cuánto queda de descanso, y
 * un toque para volver al entreno. Va por encima de la barra, nunca encima del
 * contenido: las pestañas suman su alto al que reservan las pantallas.
 */
export function ActiveWorkoutBar({ active, bottom }: { active: ActiveWorkout; bottom: number }) {
  const router = useRouter();
  const { remainingMs, running } = useRestRemaining();
  const title = running ? `Descanso ${formatRestClock(remainingMs)}` : 'Entreno en curso';
  const detail = [active.current, active.progress].filter(Boolean).join(' · ') || 'Toca para volver';

  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', left: spacing.smd, right: spacing.smd, bottom: bottom + spacing.sm }}
    >
      <PressableScale
        accessibilityHint="Vuelve al entreno"
        accessibilityLabel={`${title}. ${detail}`}
        haptic="light"
        onPress={() => router.push({ pathname: '/workouts/[id]', params: { id: active.id } })}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.smd,
          height: ACTIVE_BAR_HEIGHT,
          paddingHorizontal: spacing.md,
          borderRadius: radii.xl,
          borderCurve: 'continuous',
          backgroundColor: colors.surfaceHighest,
          boxShadow: shadows.e2,
        }}
        testID="active-workout-bar"
      >
        <Ionicons
          accessibilityElementsHidden
          color={running ? colors.accentInk : colors.text}
          importantForAccessibility="no-hide-descendants"
          name={running ? 'timer-outline' : 'barbell-outline'}
          size={iconSizes.md}
        />
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} strong tabular variant="subhead">
            {title}
          </Text>
          <Text numberOfLines={1} tone="secondary" variant="footnote">
            {detail}
          </Text>
        </View>
        <Ionicons
          accessibilityElementsHidden
          color={colors.textSecondary}
          importantForAccessibility="no-hide-descendants"
          name="chevron-up"
          size={iconSizes.md}
        />
      </PressableScale>
    </View>
  );
}
