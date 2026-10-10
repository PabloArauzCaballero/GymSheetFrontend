import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { setsLabel, weightLabel } from '@gymsheet/hooks';
import type { Exercise } from '@gymsheet/types';
import { ExerciseImage } from '@/components/media';
import { PressableScale } from '@/components/motion';
import { Text } from '@/components/text';
import { cardPadding, colors, iconSizes, minTouchTarget, radii, shadows, spacing, thumbSizes } from '@/theme';

export type ExercisePrescription = {
  series: number;
  repsMin: number | null;
  repsMax: number | null;
  pesoKg?: number | null;
  rir?: number | null;
  /** Serie por tiempo: «3 × 30 s» en lugar de las repeticiones. */
  duracionSeg?: number | null;
};

/** «4 × 8–10 · 80 kg · RIR 2» o «3 × 30 s». */
export function prescriptionLabel(p: ExercisePrescription): string {
  return [
    setsLabel({ series: p.series, repsMin: p.repsMin, repsMax: p.repsMax, duracionSeg: p.duracionSeg }),
    p.pesoKg ? `${weightLabel(p.pesoKg)} kg` : null,
    p.rir !== null && p.rir !== undefined ? `RIR ${p.rir}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

/**
 * Fila de ejercicio (C8.2): miniatura de 64 sobre la placa, nombre en 17/600,
 * la prescripción tabular y, si la hay, una burbuja con la nota. `badge` es la
 * insignia de posición en un grupo (A1/A2) o el número del bloque.
 */
export function ExerciseRow({
  exercise,
  name,
  prescription,
  caption,
  note,
  badge,
  grouped = false,
  flag,
  onPress,
  onMore,
  moreLabel = 'Más opciones',
  testID,
}: {
  exercise: Pick<Exercise, 'media' | 'nombre' | 'grupoMuscular'> | null;
  name: string;
  prescription: ExercisePrescription;
  /** Línea de apoyo: músculo en español. */
  caption?: string | null;
  note?: string | null;
  badge?: string;
  /** Dentro de un `GroupBlock`: sin tarjeta propia. */
  grouped?: boolean;
  /** Marca textual corta, p. ej. «Ajustado» en una descarga. */
  flag?: string;
  onPress?: () => void;
  /** Menú ⋯ de la fila (p. ej. «Denunciar» en un ejercicio privado ajeno). */
  onMore?: () => void;
  moreLabel?: string;
  testID?: string;
}) {
  const meta = prescriptionLabel(prescription);
  const body = (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.smd }}>
      <View>
        {exercise ? (
          <ExerciseImage exercise={exercise} rounded={radii.md} size={thumbSizes.row} />
        ) : (
          <View style={{ width: thumbSizes.row, height: thumbSizes.row, borderRadius: radii.md, backgroundColor: colors.surfaceHighest }} />
        )}
        {badge ? (
          <View
            style={{
              position: 'absolute',
              top: -spacing.xs,
              left: -spacing.xs,
              minWidth: 28,
              paddingHorizontal: spacing.xs,
              height: 22,
              borderRadius: radii.full,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: grouped ? colors.groupTint : colors.surfaceHighest,
              borderWidth: 1,
              borderColor: grouped ? colors.group : colors.borderControl,
            }}
          >
            <Text strong tabular tone={grouped ? 'group' : 'default'} variant="caption">
              {badge}
            </Text>
          </View>
        ) : null}
      </View>
      <View style={{ flex: 1, gap: spacing.xxs, minHeight: thumbSizes.row, justifyContent: 'center' }}>
        <Text numberOfLines={2} variant="headline">
          {name}
        </Text>
        <Text tabular tone="secondary" variant="subhead">
          {meta}
        </Text>
        {caption || flag ? (
          <Text numberOfLines={1} tone="muted" variant="footnote">
            {[caption, flag].filter(Boolean).join(' · ')}
          </Text>
        ) : null}
        {note ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: spacing.xs,
              marginTop: spacing.xs,
              alignSelf: 'flex-start',
              paddingHorizontal: spacing.sm,
              paddingVertical: spacing.xs,
              borderRadius: radii.md,
              backgroundColor: colors.surfaceHighest,
            }}
          >
            <Ionicons color={colors.textSecondary} name="chatbubble-ellipses-outline" size={iconSizes.sm} />
            <Text style={{ flexShrink: 1 }} tone="secondary" variant="footnote">
              {note}
            </Text>
          </View>
        ) : null}
      </View>
      {onMore ? (
        <PressableScale
          accessibilityLabel={moreLabel}
          haptic="none"
          onPress={onMore}
          scaleTo={0.94}
          style={{
            width: minTouchTarget,
            height: minTouchTarget,
            alignSelf: 'center',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: radii.full,
          }}
          testID={testID ? `${testID}-more` : undefined}
        >
          <Ionicons
            accessibilityElementsHidden
            color={colors.textSecondary}
            importantForAccessibility="no-hide-descendants"
            name="ellipsis-horizontal"
            size={iconSizes.md}
          />
        </PressableScale>
      ) : null}
      {onPress && !onMore ? (
        <Ionicons
          accessibilityElementsHidden
          color={colors.textMuted}
          importantForAccessibility="no-hide-descendants"
          name="chevron-forward"
          size={iconSizes.md}
          style={{ alignSelf: 'center' }}
        />
      ) : null}
    </View>
  );

  const frame = grouped
    ? { paddingVertical: spacing.smd }
    : {
        padding: spacing.smd,
        paddingRight: cardPadding - spacing.sm,
        borderRadius: radii.xl,
        borderCurve: 'continuous' as const,
        backgroundColor: colors.surfaceLow,
        boxShadow: shadows.e1,
      };

  const a11y = [badge, name, meta, caption, note ? `Nota: ${note}` : null].filter(Boolean).join('. ');
  if (!onPress) {
    return (
      <View accessibilityLabel={a11y} accessible style={frame} testID={testID}>
        {body}
      </View>
    );
  }
  return (
    <PressableScale
      accessibilityHint="Abre la ficha del ejercicio"
      accessibilityLabel={a11y}
      onPress={onPress}
      style={frame}
      testID={testID}
    >
      {body}
    </PressableScale>
  );
}
