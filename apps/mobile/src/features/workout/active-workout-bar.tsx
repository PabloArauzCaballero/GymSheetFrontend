import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { workoutService } from '@/api/services';
import { PressableScale } from '@/components/motion';
import { Text } from '@/components/text';
import { useReduceMotion } from '@/notifications/use-reduce-motion';
import { accentContrast, alpha, colors, iconSizes, overlay, radii, shadows, spacing } from '@/theme';
import {
  formatRestClock,
  useForegroundTick,
  useRestRemaining,
  useRestStatus,
  useWorkoutStore,
  type ActiveWorkout,
} from '@/features/workout/workout-store';

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

const LIVE = 36;

/**
 * El «en vivo» del entreno: la ficha jade con una onda que sale de ella cada
 * dos segundos, como el punto rojo de una grabación. Causa explícita (hay una
 * sesión corriendo) y una sola por pantalla; con «Reducir movimiento», quieta.
 */
function LiveBadge({ resting }: { resting: boolean }) {
  const reduceMotion = useReduceMotion();
  const wave = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return;
    wave.value = 0;
    wave.value = withRepeat(withTiming(1, { duration: 2000, easing: Easing.bezier(0.23, 1, 0.32, 1) }), -1, false);
    return () => cancelAnimation(wave);
  }, [reduceMotion, wave]);
  const ring = useAnimatedStyle(() => ({ opacity: 0.55 * (1 - wave.value), transform: [{ scale: 1 + wave.value * 0.7 }] }));
  return (
    <View style={{ width: LIVE, height: LIVE, alignItems: 'center', justifyContent: 'center' }}>
      {reduceMotion ? null : (
        <Animated.View
          pointerEvents="none"
          style={[{ position: 'absolute', width: LIVE, height: LIVE, borderRadius: LIVE / 2, borderWidth: 2, borderColor: colors.accentInk }, ring]}
        />
      )}
      <View style={{ width: LIVE, height: LIVE, borderRadius: LIVE / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.volt }}>
        <Ionicons accessibilityElementsHidden color={accentContrast()} importantForAccessibility="no-hide-descendants" name={resting ? 'timer' : 'barbell'} size={iconSizes.sm} />
      </View>
    </View>
  );
}

/** «Descanso 1:20». Aislado: su tic de un segundo repinta este texto, no la barra con su desenfoque. */
function RestTitle() {
  const { remainingMs } = useRestRemaining();
  return (
    <Text numberOfLines={1} strong tabular variant="subhead">
      {`Descanso ${formatRestClock(remainingMs)}`}
    </Text>
  );
}

/**
 * Lo que queda de descanso, como la barra de un reproductor: una sola
 * animación lineal en el hilo de UI hasta el fin, que se rearma al ajustar el
 * descanso o al volver de segundo plano (como el anillo de la pantalla del
 * descanso). Con «Reducir movimiento» no viaja: el reloj ya dice cuánto queda.
 */
function RestProgress({ endsAt, totalMs }: { endsAt: number; totalMs: number }) {
  const reduceMotion = useReduceMotion();
  const foreground = useForegroundTick();
  const left = useSharedValue(1);
  useEffect(() => {
    const remaining = Math.max(0, endsAt - Date.now());
    cancelAnimation(left);
    left.value = totalMs > 0 ? Math.min(1, remaining / totalMs) : 0;
    if (!reduceMotion) left.value = withTiming(0, { duration: remaining, easing: Easing.linear });
    return () => cancelAnimation(left);
  }, [endsAt, totalMs, reduceMotion, left, foreground]);
  const fill = useAnimatedStyle(() => ({ transform: [{ scaleX: left.value }] }));
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, backgroundColor: alpha(colors.accentInk, 0.15) }}>
      <Animated.View style={[{ width: '100%', height: 3, backgroundColor: colors.accentInk, transformOrigin: 'left' }, fill]} />
    </View>
  );
}

/**
 * Mini-barra persistente encima de las pestañas con un entreno abierto (C8.3
 * punto 9), como la de un reproductor: qué toca o cuánto queda de descanso, y
 * un toque para volver al entreno. Va por encima de la barra, nunca encima del
 * contenido: las pestañas suman su alto al que reservan las pantallas.
 */
export function ActiveWorkoutBar({ active, bottom }: { active: ActiveWorkout; bottom: number }) {
  const router = useRouter();
  // Sin tic aquí: la barra (con BlurView) solo se repinta al empezar, ajustar
  // o acabar el descanso; la cifra y la barra de progreso van por su cuenta.
  const { endsAt, totalMs, running } = useRestStatus();
  const title = running ? 'Descanso en curso' : 'Entreno en curso';
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
          paddingLeft: spacing.smd,
          paddingRight: spacing.md,
          borderRadius: radii.xl,
          borderCurve: 'continuous',
          overflow: 'hidden',
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: overlay.glass,
          boxShadow: shadows.e2,
        }}
        testID="active-workout-bar"
      >
        {/* Vidrio: el contenido pasa desenfocado por debajo. */}
        <BlurView intensity={40} style={StyleSheet.absoluteFill} tint="dark" />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: alpha(colors.surfaceHighest, 0.72) }]} />
        <LiveBadge resting={running} />
        <View style={{ flex: 1 }}>
          {running ? (
            <RestTitle />
          ) : (
            <Text numberOfLines={1} strong tabular variant="subhead">
              {title}
            </Text>
          )}
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
        {/* Lo que queda de descanso, como la barra de un reproductor. */}
        {running && endsAt !== null ? <RestProgress endsAt={endsAt} totalMs={totalMs} /> : null}
      </PressableScale>
    </View>
  );
}
