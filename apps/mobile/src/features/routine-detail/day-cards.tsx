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

/** El día no tiene nombre propio, o su nombre es el del día de la semana («Lunes»). */
function sameAsWeekday(day: Pick<RoutineDay, 'nombre' | 'diaSemana'>): boolean {
  const weekday = day.diaSemana ? WEEKDAY_NAMES[day.diaSemana as Weekday] : null;
  const name = day.nombre?.trim();
  return !name || (weekday !== null && name.toLowerCase() === weekday.toLowerCase());
}

const THUMB = 44;
const MAX_THUMBS = 4;

/**
 * Tarjeta de un día (tercera pasada, 2026-10-12): «DÍA 1 · LUNES», el nombre
 * del día y los músculos; abajo, las láminas de sus ejercicios montadas una
 * sobre otra (como las caras de quien comenta) y «6 ejercicios · ≈55 min». Un
 * solo bloque de texto y una sola fila de apoyo: antes eran tres filas, dos de
 * ellas con iconos. Abre la pantalla del Día.
 */
export function DayCard({ day, number, onPress }: { day: RoutineDay; number: number; onPress: () => void }) {
  // Solo los ejercicios con imagen: una casilla con un glifo de relleno se lee
  // como «falta la foto».
  const withArtwork = day.ejercicios.filter((item) => item.ejercicio && hasArtwork(item.ejercicio));
  const thumbs = withArtwork.slice(0, MAX_THUMBS);
  const count = day.ejercicios.length;
  const minutes = dayMinutes(day);
  const muscles = dayMuscles(day, 3);
  const countLabel = `${count} ${count === 1 ? 'ejercicio' : 'ejercicios'}`;
  const meta = [countLabel, minutes ? `≈${minutes} min` : null].filter(Boolean).join(' · ');
  return (
    <PressableScale
      accessibilityHint="Abre el día"
      accessibilityLabel={`${dayKicker(day, number)}. ${dayTitle(day)}. ${muscles.join(', ')}. ${meta}`}
      haptic="selection"
      onPress={onPress}
      scaleTo={0.975}
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
          <Text style={{ letterSpacing: 0.8 }} tone="accent" variant="caption">
            {/* Si el título ya es el día de la semana, no se repite arriba. */}
            {(sameAsWeekday(day) ? `Día ${number}` : dayKicker(day, number)).toUpperCase()}
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

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.smd }}>
        {thumbs.length >= 2 ? (
          <View style={{ flexDirection: 'row' }}>
            {thumbs.map((item, index) =>
              item.ejercicio ? (
                <View
                  key={item.id}
                  style={{
                    marginLeft: index === 0 ? 0 : -spacing.smd,
                    borderRadius: radii.full,
                    borderWidth: 2,
                    borderColor: colors.surfaceLow,
                  }}
                >
                  <ExerciseImage exercise={item.ejercicio} rounded={radii.full} size={THUMB} />
                </View>
              ) : null,
            )}
          </View>
        ) : null}
        <Text numberOfLines={1} style={{ flex: 1 }} tabular tone="muted" variant="footnote">
          {meta}
        </Text>
      </View>
    </PressableScale>
  );
}
