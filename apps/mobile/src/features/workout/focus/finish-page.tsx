import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { ScrollView, View } from 'react-native';
import { CountUpText } from '@/components/motion';
import { Text } from '@/components/text';
import { SessionMuscles } from '@/features/body-map/session-muscles';
import { EnterUp } from '@/components/motion';
import { colors, fontFamilies, fontSizes, gutter, iconSizes, metricColors, radii, spacing, tabularNums, type MetricKey } from '@/theme';

function Stat({
  value,
  label,
  suffix,
  icon,
  metric,
}: {
  value: number;
  label: string;
  suffix?: string;
  icon: keyof typeof Ionicons.glyphMap;
  metric: MetricKey;
}) {
  const tone = metricColors[metric];
  return (
    <View style={{ flex: 1, gap: spacing.xs }}>
      <View style={{ width: 32, height: 32, borderRadius: radii.full, alignItems: 'center', justifyContent: 'center', backgroundColor: tone.tint }}>
        <Ionicons color={tone.ink} name={icon} size={iconSizes.sm} />
      </View>
      <CountUpText
        style={[{ color: colors.text, fontFamily: fontFamilies.display, fontSize: fontSizes.xl }, tabularNums]}
        suffix={suffix}
        value={value}
      />
      <Text tone="muted" variant="footnote">
        {label}
      </Text>
    </View>
  );
}

/**
 * La última página: el cierre. Cuánto se hizo y, si quedó algo, qué; el botón
 * fijo de abajo pasa a ser «Finalizar sesión». Deslizar hasta aquí es la
 * forma natural de terminar, sin buscar un botón al fondo de una lista.
 */
export function FinishPage({
  width,
  bottomSpace,
  complete,
  exercisesDone,
  exercisesTotal,
  sets,
  volumeKg,
  minutes,
  pending,
  skippedSets = 0,
  omitted = [],
  muscles = [],
}: {
  width: number;
  bottomSpace: number;
  complete: boolean;
  exercisesDone: number;
  exercisesTotal: number;
  sets: number;
  volumeKg: number;
  minutes: number;
  /** Lo que queda por hacer, en claro: «Remo con barra · 2 series». */
  pending: readonly string[];
  /** Series saltadas hoy (no cuentan para el volumen). */
  skippedSets?: number;
  /** Ejercicios omitidos, con su motivo: «Remo con barra · Equipo ocupado». */
  omitted?: readonly string[];
  /** Los ejercicios con series hechas: de ellos sale el maniquí. */
  muscles?: ComponentProps<typeof SessionMuscles>['exercises'];
}) {
  return (
    <ScrollView
      contentContainerStyle={{ paddingHorizontal: gutter, paddingTop: spacing.xl, paddingBottom: bottomSpace, gap: spacing.xl }}
      showsVerticalScrollIndicator={false}
      style={{ width }}
      testID="workout-finish-page"
    >
      <View style={{ gap: spacing.sm }}>
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: radii.full,
            alignItems: 'center',
            justifyContent: 'center',
              backgroundColor: complete ? metricColors.record.tint : colors.surfaceHighest,
          }}
        >
          <Ionicons color={complete ? metricColors.record.ink : colors.text} name={complete ? 'trophy' : 'flag-outline'} size={iconSizes.lg} />
        </View>
        <Text accessibilityRole="header" variant="display">
          {complete ? (skippedSets > 0 || omitted.length > 0 ? 'Llegaste al final' : 'Sesión completa') : sets > 0 ? '¿Lo dejamos aquí?' : 'Aún no has registrado nada'}
        </Text>
        <Text tone="secondary" variant="body">
          {complete
            ? skippedSets > 0 || omitted.length > 0
              ? 'Hoy dejaste pasar algo, y está bien. Finaliza para guardarla y ver tu progreso.'
              : 'Hiciste todo lo que pedía el día. Finaliza para guardarla y ver tu progreso.'
            : sets > 0
              ? 'Puedes finalizar ahora y se guarda lo que llevas, o volver atrás y seguir.'
              : 'Desliza hacia atrás para empezar con el primer ejercicio.'}
        </Text>
      </View>

      <View style={{ gap: spacing.lg, paddingVertical: spacing.lg, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border }}>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <Stat icon="barbell-outline" label={`de ${exercisesTotal} ejercicios`} metric="weight" value={exercisesDone} />
          <Stat icon="repeat-outline" label={sets === 1 ? 'serie' : 'series'} metric="reps" value={sets} />
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <Stat icon="trending-up-outline" label="kg movidos" metric="volume" value={volumeKg} />
          <Stat icon="time-outline" label="minutos" metric="time" value={minutes} />
        </View>
      </View>

      <EnterUp index={1}>
        <SessionMuscles exercises={muscles} />
      </EnterUp>

      {skippedSets > 0 || omitted.length > 0 ? (
        <EnterUp index={1} style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Ionicons color={metricColors.skipped.ink} name="play-skip-forward" size={iconSizes.sm} />
            <Text strong variant="headline">
              Lo que dejaste pasar
            </Text>
          </View>
          {skippedSets > 0 ? (
            <Text tabular tone="secondary" variant="subhead">
              {`${skippedSets} ${skippedSets === 1 ? 'serie saltada · no cuenta' : 'series saltadas · no cuentan'} para tu volumen`}
            </Text>
          ) : null}
          {omitted.map((line) => (
            <Text key={line} tone="secondary" variant="subhead">
              {line}
            </Text>
          ))}
        </EnterUp>
      ) : null}

      {pending.length > 0 ? (
        <View style={{ gap: spacing.sm }}>
          <Text strong variant="headline">
            Te queda
          </Text>
          {pending.map((line) => (
            <Text key={line} tabular tone="secondary" variant="subhead">
              {line}
            </Text>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}
