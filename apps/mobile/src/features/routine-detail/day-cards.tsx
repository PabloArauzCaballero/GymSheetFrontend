import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import { WEEKDAY_NAMES, type Weekday } from '@gymsheet/hooks';
import type { RoutineDay } from '@gymsheet/types';
import { ExerciseImage, hasArtwork } from '@/components/media';
import { PressableScale } from '@/components/motion';
import { Text } from '@/components/text';
import { alpha, colors, fontFamilies, fontSizes, iconSizes, metricColors, overlay, radii, shadows, spacing, type MetricKey } from '@/theme';
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

const THUMB = 40;
const MAX_THUMBS = 3;
const BADGE = 56;

/** Píldora de dato con el color de su magnitud (ejercicios violeta, minutos cian). */
function MetaPill({ icon, label, metric }: { icon: keyof typeof Ionicons.glyphMap; label: string; metric: MetricKey }) {
  const tone = metricColors[metric];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, height: 26, paddingHorizontal: spacing.sm, borderRadius: radii.full, backgroundColor: tone.tint }}>
      <Ionicons color={tone.ink} name={icon} size={iconSizes.xs} />
      <Text strong style={{ color: tone.ink }} tabular variant="footnote">
        {label}
      </Text>
    </View>
  );
}

/**
 * Tarjeta de un día (cuarta pasada, 2026-10-13): a la izquierda el número del
 * día en grande sobre una ficha jade (se recorre la rutina por número, como un
 * índice); a la derecha el día de la semana, el nombre y los músculos; abajo,
 * las láminas montadas como caras y dos píldoras de color con los ejercicios y
 * los minutos. Abre la pantalla del Día.
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
  const weekday = day.diaSemana ? WEEKDAY_NAMES[day.diaSemana as Weekday] : null;
  return (
    <PressableScale
      accessibilityHint="Abre el día"
      accessibilityLabel={`${dayKicker(day, number)}. ${dayTitle(day)}. ${muscles.join(', ')}. ${meta}`}
      haptic="selection"
      onPress={onPress}
      scaleTo={0.97}
      style={{
        gap: spacing.md,
        padding: spacing.md,
        borderRadius: radii.xl,
        borderCurve: 'continuous',
        overflow: 'hidden',
        backgroundColor: colors.surfaceLow,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: overlay.glass,
        boxShadow: shadows.e1,
      }}
      testID={`day-card-${day.id}`}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        {/* El número del día: el ancla con la que se recorre la rutina. */}
        <View style={{ width: BADGE, height: BADGE, borderRadius: radii.lg, borderCurve: 'continuous', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
          <LinearGradient colors={[alpha(colors.volt, 0.38), alpha(colors.volt, 0.14)]} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
          <Text style={{ color: colors.accentInk, fontSize: fontSizes.xs, letterSpacing: 1.2, lineHeight: 14 }} variant="caption">
            DÍA
          </Text>
          <Text style={{ color: colors.text, fontFamily: fontFamilies.display, fontSize: fontSizes.xl, lineHeight: 30 }} tabular>
            {number}
          </Text>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          {weekday && !sameAsWeekday(day) ? (
            <Text style={{ letterSpacing: 0.8 }} tone="accent" variant="caption">
              {weekday.toUpperCase()}
            </Text>
          ) : null}
          <Text numberOfLines={2} variant="headline">
            {dayTitle(day)}
          </Text>
          {muscles.length > 0 ? (
            <Text numberOfLines={1} tone="secondary" variant="footnote">
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

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm }}>
        {thumbs.length > 0 ? (
          <View style={{ flexDirection: 'row', marginRight: spacing.xs }}>
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
        <MetaPill icon="barbell-outline" label={countLabel} metric="reps" />
        {minutes ? <MetaPill icon="time-outline" label={`≈${minutes} min`} metric="time" /> : null}
      </View>
    </PressableScale>
  );
}
