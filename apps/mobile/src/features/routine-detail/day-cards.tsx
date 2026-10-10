import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { WEEKDAY_NAMES, type Weekday } from '@gymsheet/hooks';
import type { RoutineDay } from '@gymsheet/types';
import { ExerciseImage } from '@/components/media';
import { PressableScale } from '@/components/motion';
import { Text } from '@/components/text';
import { colors, iconSizes, radii, shadows, spacing, thumbSizes } from '@/theme';
import { dayMinutes } from '@/features/routine-detail/routine-plan';

export function dayKicker(day: Pick<RoutineDay, 'diaSemana'>, number: number): string {
  const weekday = day.diaSemana ? WEEKDAY_NAMES[day.diaSemana as Weekday] : 'Cualquier día';
  return `${weekday} · Día ${number}`;
}

export function dayTitle(day: Pick<RoutineDay, 'nombre' | 'diaSemana'>): string {
  return day.nombre?.trim() || (day.diaSemana ? WEEKDAY_NAMES[day.diaSemana as Weekday] : 'Entreno');
}

/** Cada miniatura (40 + 2 de borde por lado) asoma 28 sobre la anterior. */
const STACK_OVERLAP = thumbSizes.stack / 2 - spacing.xs;
const STACK_WIDTH = (thumbSizes.stack + 4) * 3 - STACK_OVERLAP * 2;

/**
 * Tarjeta de un día (C8.3.1): tres miniaturas apiladas, «Lunes · Día 1», el
 * nombre del día y «6 ejercicios · ≈55 min». Abre la pantalla del Día.
 */
export function DayCard({
  day,
  number,
  onPress,
}: {
  day: RoutineDay;
  number: number;
  onPress: () => void;
}) {
  const thumbs = day.ejercicios.filter((item) => item.ejercicio).slice(0, 3);
  const count = day.ejercicios.length;
  const minutes = dayMinutes(day);
  const meta = [`${count} ${count === 1 ? 'ejercicio' : 'ejercicios'}`, minutes ? `≈${minutes} min` : null]
    .filter(Boolean)
    .join(' · ');
  return (
    <PressableScale
      accessibilityHint="Abre el día"
      accessibilityLabel={`${dayKicker(day, number)}. ${dayTitle(day)}. ${meta}`}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.smd,
        padding: spacing.smd,
        borderRadius: radii.xl,
        borderCurve: 'continuous',
        backgroundColor: colors.surfaceLow,
        boxShadow: shadows.e1,
      }}
      testID={`day-card-${day.id}`}
    >
      <View style={{ flexDirection: 'row', width: STACK_WIDTH }}>
        {thumbs.length === 0 ? (
          <View style={{ width: thumbSizes.stack, height: thumbSizes.stack, borderRadius: radii.sm, backgroundColor: colors.surfaceHighest }} />
        ) : (
          thumbs.map((item, index) =>
            item.ejercicio ? (
              <View
                key={item.id}
                style={{
                  marginLeft: index === 0 ? 0 : -STACK_OVERLAP,
                  borderRadius: radii.sm + 2,
                  borderWidth: 2,
                  borderColor: colors.surfaceLow,
                }}
              >
                <ExerciseImage exercise={item.ejercicio} rounded={radii.sm} size={thumbSizes.stack} />
              </View>
            ) : null,
          )
        )}
      </View>
      <View style={{ flex: 1, gap: spacing.xxs }}>
        <Text tone="muted" variant="footnote">
          {dayKicker(day, number)}
        </Text>
        <Text numberOfLines={2} variant="headline">
          {dayTitle(day)}
        </Text>
        <Text tabular tone="secondary" variant="subhead">
          {meta}
        </Text>
      </View>
      <Ionicons
        accessibilityElementsHidden
        color={colors.textMuted}
        importantForAccessibility="no-hide-descendants"
        name="chevron-forward"
        size={iconSizes.md}
      />
    </PressableScale>
  );
}
