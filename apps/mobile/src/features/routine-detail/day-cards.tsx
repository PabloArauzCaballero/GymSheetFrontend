import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { WEEKDAY_NAMES, type Weekday } from '@gymsheet/hooks';
import type { RoutineDay } from '@gymsheet/types';
import { ExerciseImage, hasArtwork } from '@/components/media';
import { PressableScale } from '@/components/motion';
import { Text } from '@/components/text';
import { cardPadding, colors, iconSizes, radii, shadows, spacing } from '@/theme';
import { dayMinutes, dayMuscles } from '@/features/routine-detail/routine-plan';

export function dayKicker(day: Pick<RoutineDay, 'diaSemana'>, number: number): string {
  const weekday = day.diaSemana ? WEEKDAY_NAMES[day.diaSemana as Weekday] : 'Cualquier día';
  return `${weekday} · Día ${number}`;
}

export function dayTitle(day: Pick<RoutineDay, 'nombre' | 'diaSemana'>): string {
  return day.nombre?.trim() || (day.diaSemana ? WEEKDAY_NAMES[day.diaSemana as Weekday] : 'Entreno');
}

const THUMB = 60;

/** «🏋 5 ejercicios», «🕑 ≈43 min»: el dato con su icono, sin otra tarjeta. */
function MetaItem({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
      <Ionicons color={colors.textMuted} name={icon} size={iconSizes.sm} />
      <Text tabular tone="secondary" variant="footnote">
        {label}
      </Text>
    </View>
  );
}
const MAX_THUMBS = 4;

/**
 * Tarjeta de un día (rediseño 2026-10-11): «LUNES · DÍA 1», el nombre del día,
 * los músculos que trabaja y «6 ejercicios · ≈55 min», con una tira de
 * miniaturas de los ejercicios (y «+N» si hay más). Abre la pantalla del Día.
 */
export function DayCard({ day, number, onPress }: { day: RoutineDay; number: number; onPress: () => void }) {
  // Solo los ejercicios con imagen: una casilla con un glifo de relleno se lee
  // como «falta la foto». Los demás se cuentan en «+N». Cuatro casillas como
  // mucho (caben en un iPhone SE).
  const withArtwork = day.ejercicios.filter((item) => item.ejercicio && hasArtwork(item.ejercicio));
  const thumbs = withArtwork.slice(0, day.ejercicios.length > MAX_THUMBS ? MAX_THUMBS - 1 : MAX_THUMBS);
  const rest = day.ejercicios.length - thumbs.length;
  const count = day.ejercicios.length;
  const minutes = dayMinutes(day);
  const muscles = dayMuscles(day, 3);
  const countLabel = `${count} ${count === 1 ? 'ejercicio' : 'ejercicios'}`;
  const meta = [countLabel, minutes ? `≈${minutes} min` : null].filter(Boolean).join(' · ');
  return (
    <PressableScale
      accessibilityHint="Abre el día"
      accessibilityLabel={`${dayKicker(day, number)}. ${dayTitle(day)}. ${muscles.join(', ')}. ${meta}`}
      onPress={onPress}
      scaleTo={0.985}
      style={{
        gap: spacing.md,
        padding: cardPadding,
        borderRadius: radii.xl,
        borderCurve: 'continuous',
        backgroundColor: colors.surfaceLow,
        boxShadow: shadows.e1,
      }}
      testID={`day-card-${day.id}`}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.smd }}>
        <View style={{ flex: 1, gap: spacing.xs }}>
          <Text style={{ letterSpacing: 0.6 }} tone="muted" variant="caption">
            {dayKicker(day, number).toUpperCase()}
          </Text>
          <Text numberOfLines={2} variant="headline">
            {dayTitle(day)}
          </Text>
          {muscles.length > 0 ? (
            <Text numberOfLines={1} tone="secondary" variant="subhead">
              {muscles.join(' · ')}
            </Text>
          ) : null}
        </View>
        <Ionicons
          accessibilityElementsHidden
          color={colors.textMuted}
          importantForAccessibility="no-hide-descendants"
          name="chevron-forward"
          size={iconSizes.md}
        />
      </View>

      {/* Dos imágenes como mínimo: una sola junto a «+3» se leía como una
          tira a medio cargar. */}
      {thumbs.length >= 2 ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
          }}
        >
          {thumbs.map((item) =>
            item.ejercicio ? (
              <ExerciseImage exercise={item.ejercicio} key={item.id} rounded={radii.md} size={THUMB} />
            ) : null,
          )}
          {rest > 0 ? (
            <View
              style={{
                width: THUMB,
                height: THUMB,
                borderRadius: radii.md,
                borderCurve: 'continuous',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.surfaceHighest,
              }}
            >
              <Text strong tabular tone="secondary" variant="subhead">{`+${rest}`}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <MetaItem icon="barbell-outline" label={countLabel} />
        {minutes ? <MetaItem icon="time-outline" label={`≈${minutes} min`} /> : null}
      </View>
    </PressableScale>
  );
}
