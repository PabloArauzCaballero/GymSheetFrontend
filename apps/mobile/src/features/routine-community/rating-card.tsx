import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { ApiError } from '@gymsheet/api-client';
import { ratingLabel } from '@gymsheet/hooks';
import type { ContentRating, Routine } from '@gymsheet/types';
import { communityService } from '@/api/services';
import { AnimatedDecimal, BadgePop, Pop, PREMIUM_EASING, PressableScale } from '@/components/motion';
import { Text } from '@/components/text';
import { notify } from '@/notifications';
import { useReduceMotion } from '@/notifications/use-reduce-motion';
import { RatingStars } from '@/features/routine-detail/detail-header';
import { cardPadding, colors, fontFamilies, fontSizes, iconSizes, minTouchTarget, radii, ratingStar, shadows, spacing, stagger } from '@/theme';

const STAR = 36;
const CELL = minTouchTarget + spacing.sm;

/** Lo que significa cada nota, dicho como lo diría alguien del gimnasio. */
const WORDS = ['', 'No es para mí', 'Le falta', 'Cumple', 'Muy buena', 'La recomiendo'] as const;

/** La media y el total si yo paso de `before` a `after` estrellas (null = sin valorar). */
export function applyMyRating(summary: ContentRating, after: number | null): ContentRating {
  const before = summary.miValoracion;
  const sum = (summary.promedio ?? 0) * summary.total - (before ?? 0) + (after ?? 0);
  const total = summary.total - (before ? 1 : 0) + (after ? 1 : 0);
  const distribucion = summary.distribucion
    ? {
        ...summary.distribucion,
        ...(before ? { [String(before)]: Math.max(0, summary.distribucion[String(before) as '1'] - 1) } : null),
      }
    : summary.distribucion;
  if (distribucion && after) {
    const key = String(after) as '1';
    distribucion[key] = (distribucion[key] ?? 0) + 1;
  }
  return {
    ...summary,
    miValoracion: after,
    total,
    promedio: total > 0 ? Math.round((sum / total) * 10) / 10 : null,
    distribucion,
  };
}

/** Una barra de la distribución: crece desde la izquierda al aparecer y al cambiar. */
function Bar({ stars, count, max, index }: { stars: number; count: number; max: number; index: number }) {
  const reduceMotion = useReduceMotion();
  const fill = useSharedValue(0);
  const target = max > 0 ? count / max : 0;
  useEffect(() => {
    fill.value = reduceMotion
      ? target
      : withDelay(index * stagger, withTiming(target, { duration: 420, easing: PREMIUM_EASING }));
  }, [fill, index, reduceMotion, target]);
  const animated = useAnimatedStyle(() => ({ transform: [{ scaleX: Math.max(fill.value, 0.001) }] }));
  return (
    <View
      accessibilityLabel={`${stars} ${stars === 1 ? 'estrella' : 'estrellas'}: ${count}`}
      accessible
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
    >
      <Text style={{ width: 10, textAlign: 'center' }} tabular tone="muted" variant="caption">
        {stars}
      </Text>
      <View style={{ flex: 1, height: 6, borderRadius: radii.full, backgroundColor: colors.surfaceHighest, overflow: 'hidden' }}>
        <Animated.View
          style={[
            { flex: 1, borderRadius: radii.full, backgroundColor: ratingStar, transformOrigin: 'left' },
            animated,
          ]}
        />
      </View>
    </View>
  );
}

/**
 * La fila de cinco estrellas para valorar. Se elige tocando o ARRASTRANDO el
 * dedo sobre la fila (las estrellas se van encendiendo bajo el dedo, con un
 * tic háptico en cada paso); al soltar se guarda y las estrellas elegidas
 * saltan en cascada. El arrastre es horizontal: un gesto vertical sigue
 * desplazando la pantalla.
 */
function StarInput({
  value,
  disabled,
  onRate,
}: {
  value: number | null;
  disabled: boolean;
  onRate: (stars: number) => void;
}) {
  const [preview, setPreview] = useState<number | null>(null);
  const [burst, setBurst] = useState(0);
  const last = useSharedValue(0);
  const shown = preview ?? value ?? 0;

  const step = (stars: number) => {
    setPreview(stars);
    void Haptics.selectionAsync();
  };
  const commit = (stars: number) => {
    setPreview(null);
    setBurst((n) => n + 1);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onRate(stars);
  };
  const cancel = () => setPreview(null);

  const starAt = (x: number) => {
    'worklet';
    return Math.min(5, Math.max(1, Math.floor(x / CELL) + 1));
  };
  const pan = Gesture.Pan()
    .enabled(!disabled)
    .activeOffsetX([-6, 6])
    .failOffsetY([-14, 14])
    .onStart((event) => {
      last.value = starAt(event.x);
      scheduleOnRN(step, last.value);
    })
    .onUpdate((event) => {
      const next = starAt(event.x);
      if (next !== last.value) {
        last.value = next;
        scheduleOnRN(step, next);
      }
    })
    .onEnd(() => {
      scheduleOnRN(commit, last.value);
    })
    .onFinalize((_event, success) => {
      if (!success) scheduleOnRN(cancel);
    });
  const tap = Gesture.Tap()
    .enabled(!disabled)
    .onEnd((event) => {
      scheduleOnRN(commit, starAt(event.x));
    });

  return (
    <GestureDetector gesture={Gesture.Race(pan, tap)}>
      <View
        accessibilityActions={[
          { name: 'increment', label: 'Una estrella más' },
          { name: 'decrement', label: 'Una estrella menos' },
        ]}
        accessibilityLabel="Tu valoración"
        accessibilityRole="adjustable"
        accessibilityState={{ disabled }}
        accessibilityValue={{ min: 0, max: 5, now: value ?? 0, text: value ? `${value} de 5` : 'Sin valorar' }}
        accessible
        onAccessibilityAction={(event) => {
          if (disabled) return;
          const current = value ?? 0;
          if (event.nativeEvent.actionName === 'increment') commit(Math.min(5, current + 1));
          if (event.nativeEvent.actionName === 'decrement' && current > 1) commit(current - 1);
        }}
        style={{ flexDirection: 'row', width: CELL * 5, opacity: disabled ? 0.35 : 1 }}
        testID="rating-input"
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const on = shown >= star;
          return (
            <View
              key={star}
              style={{ width: CELL, height: CELL, alignItems: 'center', justifyContent: 'center' }}
              testID={`star-${star}`}
            >
              {/* En cascada: cada estrella elegida salta un poco después de la anterior. */}
              <Pop delay={(star - 1) * stagger} trigger={on && preview === null ? burst : 0}>
                <Ionicons color={on ? ratingStar : colors.textDisabled} name={on ? 'star' : 'star-outline'} size={STAR} />
              </Pop>
            </View>
          );
        })}
      </View>
    </GestureDetector>
  );
}

/**
 * Valoración de una rutina pública: la nota media (que cuenta hasta su nuevo
 * valor cuando alguien valora), cuántas reseñas hay, la distribución por
 * estrellas si el servidor la envía, y «Tu valoración», que se puede cambiar o
 * quitar. Se guarda de forma optimista: la pantalla responde al dedo y, si el
 * servidor falla, vuelve a lo que había y lo dice.
 */
export function RatingCard({ routine }: { routine: Routine }) {
  const queryClient = useQueryClient();
  const key = ['community', 'rating', routine.id] as const;
  const rating = useQuery({
    queryKey: key,
    queryFn: () => communityService.ratingSummary('ROUTINE', routine.id),
  });
  const summary: ContentRating = rating.data ?? { ...routine.valoracion, miValoracion: null };

  const save = useMutation({
    mutationFn: (stars: number | null) =>
      stars === null
        ? communityService.removeRating('ROUTINE', routine.id)
        : communityService.rate('ROUTINE', routine.id, stars),
    onMutate: async (stars) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ContentRating>(key);
      queryClient.setQueryData<ContentRating>(key, applyMyRating(previous ?? summary, stars));
      return { previous };
    },
    onSuccess: (data, stars) => {
      queryClient.setQueryData(key, data);
      void queryClient.invalidateQueries({ queryKey: ['routine', routine.id] });
      void queryClient.invalidateQueries({ queryKey: ['routines'] });
      if (stars !== null) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (error: Error, _stars, context) => {
      queryClient.setQueryData(key, context?.previous);
      if (error instanceof ApiError && error.code === 'CANNOT_RATE_OWN') notify.info('No puedes valorar tu rutina.');
      else notify.error(error);
    },
  });

  const mine = summary.miValoracion;
  const distribution = summary.distribucion ?? null;
  const max = distribution ? Math.max(...Object.values(distribution)) : 0;

  return (
    <View
      style={{
        gap: spacing.mdl,
        padding: cardPadding,
        borderRadius: radii.xl,
        borderCurve: 'continuous',
        backgroundColor: colors.surfaceLow,
        boxShadow: shadows.e1,
      }}
      testID="rating-card"
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.mdl }}>
        <View
          accessibilityLabel={ratingLabel(summary).replace('★', 'Valoración')}
          accessibilityLiveRegion="polite"
          accessible
          style={{ alignItems: 'center', gap: spacing.xs, minWidth: 84 }}
          testID="rating-summary"
        >
          {summary.promedio ? (
            <AnimatedDecimal
              style={{
                color: colors.text,
                fontFamily: fontFamilies.display,
                fontSize: fontSizes['2xl'] + 6,
                lineHeight: Math.round((fontSizes['2xl'] + 6) * 1.1),
                letterSpacing: -0.8,
              }}
              value={summary.promedio}
            />
          ) : (
            <Text tone="muted" variant="display">
              —
            </Text>
          )}
          {summary.promedio ? <RatingStars size={iconSizes.xs + 1} value={summary.promedio} /> : null}
          <BadgePop value={summary.total}>
            <Text tabular tone="muted" variant="caption">
              {summary.total === 0 ? 'Sin reseñas aún' : summary.total === 1 ? '1 reseña' : `${summary.total} reseñas`}
            </Text>
          </BadgePop>
        </View>
        {distribution ? (
          <View style={{ flex: 1, gap: spacing.xs + 1 }} testID="rating-distribution">
            {[5, 4, 3, 2, 1].map((stars, index) => (
              <Bar count={distribution[String(stars) as '1'] ?? 0} index={index} key={stars} max={max} stars={stars} />
            ))}
          </View>
        ) : (
          <Text style={{ flex: 1 }} tone="secondary" variant="subhead">
            {summary.total === 0
              ? 'Nadie la ha valorado todavía. La primera nota es la que más ayuda.'
              : 'Lo que opina la gente que ya la entrenó.'}
          </Text>
        )}
      </View>

      <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border }} />

      <View style={{ alignItems: 'center', gap: spacing.xs }}>
        <Text strong variant="subhead">
          {routine.esMia ? 'Es tu rutina: la valoran los demás' : mine ? 'Tu valoración' : '¿Qué te pareció?'}
        </Text>
        <StarInput disabled={routine.esMia} onRate={(stars) => save.mutate(stars)} value={mine} />
        {routine.esMia ? null : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.smd, minHeight: minTouchTarget }}>
            <Text testID="my-rating" tone={mine ? 'accent' : 'muted'} variant="footnote">
              {mine ? `${mine} de 5 · ${WORDS[mine]}` : 'Toca una estrella o desliza el dedo'}
            </Text>
            {mine ? (
              <PressableScale
                accessibilityLabel="Quitar mi valoración"
                haptic="selection"
                hitSlop={12}
                onPress={() => save.mutate(null)}
                testID="remove-rating"
              >
                <Text strong tone="muted" variant="footnote">
                  Quitar
                </Text>
              </PressableScale>
            ) : null}
          </View>
        )}
      </View>
    </View>
  );
}
