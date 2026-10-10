import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { formatClock } from '@gymsheet/hooks';
import type { Exercise, WorkoutSet } from '@gymsheet/types';
import { ExerciseImage } from '@/components/media';
import { PressableScale } from '@/components/motion';
import { Text } from '@/components/text';
import { colors, iconSizes, minTouchTarget, radii, shadows, spacing, thumbSizes } from '@/theme';
import { kgLabel } from '@/features/workout/workout-flow';

/** «60 kg × 12», como lo apunta la gente (y lo buscan los flujos de Maestro). */
export function setLabel(set: Pick<WorkoutSet, 'tipoSerie' | 'pesoKg' | 'repeticiones' | 'duracionSeg' | 'distanciaM'>): string {
  if (set.tipoSerie === 'CARDIO') {
    return [
      formatClock(set.duracionSeg ?? 0),
      set.distanciaM ? `${(set.distanciaM / 1000).toFixed(1).replace('.', ',')} km` : null,
    ]
      .filter(Boolean)
      .join(' · ');
  }
  return `${kgLabel(set.pesoKg ?? 0)} kg × ${set.repeticiones ?? 0}`;
}

function Thumb({ exercise, size }: { exercise: Pick<Exercise, 'media' | 'nombre' | 'grupoMuscular'> | null; size: number }) {
  if (exercise) return <ExerciseImage exercise={exercise} rounded={radii.md} size={size} />;
  return <View style={{ width: size, height: size, borderRadius: radii.md, backgroundColor: colors.surfaceHighest }} />;
}

function Badge({ label }: { label: string }) {
  return (
    <View
      style={{
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xxs,
        borderRadius: radii.full,
        backgroundColor: colors.groupTint,
        borderWidth: 1,
        borderColor: colors.group,
      }}
    >
      <Text strong tabular tone="group" variant="caption">
        {label}
      </Text>
    </View>
  );
}

/**
 * Ejercicio contraído (C8.3.3): miniatura, nombre y su progreso («2/4»), con
 * ✓ cuando está hecho. Tocarlo lo convierte en el actual.
 */
export function CollapsedExercise({
  exercise,
  name,
  badge,
  progress,
  best,
  done,
  grouped = false,
  onPress,
  testID,
}: {
  exercise: Pick<Exercise, 'media' | 'nombre' | 'grupoMuscular'> | null;
  name: string;
  badge?: string | null;
  progress: string;
  /** La mejor serie de hoy («60 kg × 12»). */
  best: string | null;
  done: boolean;
  grouped?: boolean;
  onPress?: () => void;
  testID?: string;
}) {
  const a11y = [badge, name, done ? 'hecho' : null, `${progress} series`, best ? `mejor serie ${best}` : null]
    .filter(Boolean)
    .join(', ');
  return (
    <PressableScale
      accessibilityHint={onPress ? 'Lo pasa a ejercicio actual' : undefined}
      accessibilityLabel={a11y}
      disabled={!onPress}
      haptic="selection"
      onPress={onPress ?? (() => undefined)}
      style={[
        { flexDirection: 'row', alignItems: 'center', gap: spacing.smd, minHeight: minTouchTarget + spacing.md },
        grouped
          ? { paddingVertical: spacing.xs }
          : {
              padding: spacing.sm,
              paddingRight: spacing.md,
              borderRadius: radii.xl,
              borderCurve: 'continuous',
              backgroundColor: colors.surfaceLow,
            },
      ]}
      testID={testID}
    >
      <View style={{ opacity: done ? 0.6 : 1 }}>
        <Thumb exercise={exercise} size={thumbSizes.stack + spacing.xs} />
      </View>
      <View style={{ flex: 1, gap: spacing.xxs }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          {badge ? <Badge label={badge} /> : null}
          <Text numberOfLines={1} style={{ flex: 1 }} tone={done ? 'secondary' : 'default'} variant="headline">
            {name}
          </Text>
        </View>
        {best ? (
          <Text numberOfLines={1} tabular tone="muted" variant="footnote">
            {`Mejor: ${best}`}
          </Text>
        ) : null}
      </View>
      {done ? (
        <Ionicons accessibilityElementsHidden color={colors.textSecondary} importantForAccessibility="no-hide-descendants" name="checkmark-circle" size={iconSizes.lg} />
      ) : (
        <Text strong tabular tone="secondary" variant="subhead">
          {progress}
        </Text>
      )}
    </PressableScale>
  );
}

/**
 * El ejercicio actual, desplegado: miniatura de 64, nombre, el objetivo
 * («3 × 8–12 · 60 kg · RIR 2»), las series de hoy y, debajo, lo que se
 * registra (`children`). Solo hay uno desplegado a la vez.
 */
export function CurrentExercise({
  exercise,
  name,
  badge,
  target,
  progress,
  sets,
  note,
  grouped = false,
  onOpenDetail,
  children,
  footer,
  testID,
}: {
  exercise: Pick<Exercise, 'media' | 'nombre' | 'grupoMuscular'> | null;
  name: string;
  badge?: string | null;
  target: string | null;
  progress: string;
  sets: readonly WorkoutSet[];
  note?: string | null;
  grouped?: boolean;
  onOpenDetail?: () => void;
  children?: ReactNode;
  /** Tras las series de hoy («Deshacer última serie»). */
  footer?: ReactNode;
  testID?: string;
}) {
  const ordered = [...sets].sort((a, b) => a.numeroSerie - b.numeroSerie);
  return (
    <View
      style={[
        { gap: spacing.md },
        grouped
          ? { paddingVertical: spacing.sm }
          : {
              padding: spacing.md,
              borderRadius: radii.xl,
              borderCurve: 'continuous',
              backgroundColor: colors.surfaceLow,
              boxShadow: shadows.e1,
            },
      ]}
      testID={testID}
    >
      <PressableScale
        accessibilityHint={onOpenDetail ? 'Abre la ficha del ejercicio' : undefined}
        accessibilityLabel={[badge, name, target ? `objetivo ${target}` : null, `${progress} series`].filter(Boolean).join(', ')}
        disabled={!onOpenDetail}
        haptic="none"
        onPress={onOpenDetail ?? (() => undefined)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.smd }}
      >
        <Thumb exercise={exercise} size={thumbSizes.row} />
        <View style={{ flex: 1, gap: spacing.xxs }}>
          {badge ? (
            <View style={{ flexDirection: 'row' }}>
              <Badge label={badge} />
            </View>
          ) : null}
          <Text numberOfLines={2} variant="title">
            {name}
          </Text>
          {target ? (
            <Text tabular testID="current-target" tone="secondary" variant="subhead">
              {target}
            </Text>
          ) : null}
        </View>
        <Text strong tabular testID="current-progress" variant="headline">
          {progress}
        </Text>
      </PressableScale>

      {note ? (
        <View style={{ flexDirection: 'row', gap: spacing.xs, padding: spacing.sm, borderRadius: radii.md, backgroundColor: colors.surface }}>
          <Ionicons color={colors.textSecondary} name="chatbubble-ellipses-outline" size={iconSizes.sm} />
          <Text style={{ flexShrink: 1 }} tone="secondary" variant="footnote">
            {note}
          </Text>
        </View>
      ) : null}

      {children}

      {ordered.length > 0 ? (
        <View style={{ gap: spacing.xs }}>
          {ordered.map((set) => (
            <View key={set.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <Text style={{ minWidth: spacing.lg }} tabular tone="muted" variant="footnote">
                {`#${set.numeroSerie}`}
              </Text>
              <Text strong style={{ flex: 1 }} tabular variant="subhead">
                {setLabel(set)}
              </Text>
              <Text tabular tone="muted" variant="footnote">
                {set.tipoSerie === 'CARDIO' ? (set.rpe ? `Esf. ${set.rpe}` : '') : `RIR ${set.rir ?? 0}`}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {footer}
    </View>
  );
}
