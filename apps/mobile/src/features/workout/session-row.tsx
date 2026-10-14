import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import type { Workout } from '@gymsheet/types';
import { Badge } from '@/components/layout';
import { formatThousandsEs, PressableScale } from '@/components/motion';
import { Text } from '@/components/text';
import { countSets, volumeOf } from '@/features/workout/use-workout-session';
import { sessionTitle } from '@/features/workout/workout-flow';
import { WORKOUT_LABEL, WORKOUT_TONE, formatDuration, formatTimeOfDay, relativeDay } from '@/lib/format';
import { colors, iconSizes, metricColors, minTouchTarget, radii, shadows, spacing, type MetricKey } from '@/theme';

const LOOK: Record<Workout['estado'], { icon: keyof typeof Ionicons.glyphMap; metric: MetricKey }> = {
  EN_PROGRESO: { icon: 'flame', metric: 'streak' },
  FINALIZADA: { icon: 'barbell', metric: 'weight' },
  CANCELADA: { icon: 'close', metric: 'skipped' },
};

function Metric({ icon, metric, value }: { icon: keyof typeof Ionicons.glyphMap; metric: MetricKey; value: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
      <Ionicons color={metricColors[metric].ink} name={icon} size={iconSizes.xs} />
      <Text tabular tone="secondary" variant="footnote">
        {value}
      </Text>
    </View>
  );
}

/**
 * Una sesión en el historial: qué día era (no «Hace 3 días 23:56»), cuándo fue
 * y lo que se movió, con el color de cada magnitud. Una sesión terminada no
 * lleva etiqueta: es lo normal; solo se marca la que sigue abierta o se canceló.
 */
export function SessionRow({ session, onPress }: { session: Workout; onPress: () => void }) {
  const look = LOOK[session.estado];
  const tone = metricColors[look.metric];
  const head = sessionTitle(session.observacion);
  const sets = countSets(session);
  const volume = Math.round(volumeOf(session));
  const duration = formatDuration(session.fechaInicio, session.fechaFin);
  const when = [relativeDay(session.fechaInicio), formatTimeOfDay(session.fechaInicio)].filter(Boolean).join(' · ');
  const cancelled = session.estado === 'CANCELADA';
  const title = head.title === 'Entrenamiento' ? 'Entreno libre' : head.title;
  return (
    <PressableScale
      accessibilityLabel={`${title}, ${when}, ${WORKOUT_LABEL[session.estado]}. ${session.ejercicios.length} ejercicios, ${sets} series.`}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.smd,
        minHeight: minTouchTarget + spacing.xl,
        padding: spacing.smd,
        borderRadius: radii.xl,
        borderCurve: 'continuous',
        backgroundColor: colors.surfaceLow,
        boxShadow: shadows.card,
        opacity: cancelled ? 0.72 : 1,
      }}
      testID={`session-${session.id}`}
    >
      <View style={{ width: 44, height: 44, borderRadius: radii.full, alignItems: 'center', justifyContent: 'center', backgroundColor: tone.tint }}>
        <Ionicons color={tone.ink} name={look.icon} size={iconSizes.md} />
      </View>
      <View style={{ flex: 1, gap: spacing.xxs }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Text numberOfLines={1} strong style={{ flexShrink: 1 }} variant="headline">
            {title}
          </Text>
          {session.estado === 'FINALIZADA' ? null : <Badge label={WORKOUT_LABEL[session.estado]} tone={WORKOUT_TONE[session.estado]} />}
        </View>
        <Text numberOfLines={1} tone="muted" variant="footnote">
          {head.subtitle ? `${when} · ${head.subtitle}` : when}
        </Text>
        {cancelled && sets === 0 ? null : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.smd, rowGap: spacing.xxs, marginTop: spacing.xxs }}>
            <Metric icon="barbell-outline" metric="weight" value={`${session.ejercicios.length} ${session.ejercicios.length === 1 ? 'ejercicio' : 'ejercicios'}`} />
            <Metric icon="repeat-outline" metric="reps" value={`${sets} ${sets === 1 ? 'serie' : 'series'}`} />
            {volume > 0 ? <Metric icon="trending-up-outline" metric="volume" value={`${formatThousandsEs(volume)} kg`} /> : null}
            {duration ? <Metric icon="time-outline" metric="time" value={duration} /> : null}
          </View>
        )}
      </View>
      <Ionicons color={colors.textMuted} name="chevron-forward" size={iconSizes.sm} />
    </PressableScale>
  );
}
