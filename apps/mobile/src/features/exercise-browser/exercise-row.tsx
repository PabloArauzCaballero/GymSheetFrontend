import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import type { Exercise } from '@gymsheet/types';
import { bodyPartLabelEs, exerciseGroupLabelEs, muscleLabelEs } from '@gymsheet/domain';
import { ExerciseImage } from '@/components/media';
import { PressableScale } from '@/components/motion';
import {
  accentContrast,
  colors,
  fontSizes,
  iconSizes,
  minTouchTarget,
  radii,
  semibold,
  spacing,
} from '@/theme';

/** A single fact about an exercise, sized to sit two or three to a row. */
export function Tag({ label, accent = false }: { label: string; accent?: boolean }) {
  return (
    <View
      style={{
        paddingHorizontal: spacing.sm,
        paddingVertical: 3,
        borderRadius: radii.full,
        borderWidth: 1,
        borderColor: accent ? colors.accentInk : colors.border,
        // Se compone desde el acento vigente en vez de escribir el verde de la
        // identidad de referencia: con el valor fijo, un gimnasio de marca roja
        // veía esta etiqueta verde en medio de una pantalla roja.
        backgroundColor: accent ? `${colors.volt}14` : colors.surfaceHigh,
      }}
    >
      <Text
        numberOfLines={1}
        style={{
          color: accent ? colors.accentInk : colors.textMuted,
          fontSize: fontSizes.xs,
          fontWeight: semibold,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

/**
 * Botón «+» de una fila en modo selección. Al añadir pasa a «✓ Añadido» y vuelve
 * a quitar el ejercicio: el estado se lee por el texto y el icono, no solo por el
 * color. El área táctil es de 44 pt como mínimo, con `hitSlop` extra.
 */
export function PickButton({
  added,
  name,
  onToggle,
  testID,
}: {
  added: boolean;
  name: string;
  onToggle: () => void;
  testID?: string;
}) {
  return (
    <PressableScale
      accessibilityLabel={added ? `Quitar ${name} de la rutina. Añadido` : `Añadir ${name}`}
      accessibilityRole="button"
      accessibilityState={{ selected: added }}
      haptic="selection"
      hitSlop={spacing.sm}
      onPress={onToggle}
      scaleTo={0.92}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        minWidth: minTouchTarget,
        minHeight: minTouchTarget,
        paddingHorizontal: added ? spacing.md : 0,
        borderRadius: radii.full,
        borderWidth: 1,
        borderColor: colors.volt,
        backgroundColor: added ? colors.volt : 'transparent',
      }}
      testID={testID}
    >
      <Ionicons
        accessibilityElementsHidden
        color={added ? accentContrast() : colors.volt}
        importantForAccessibility="no-hide-descendants"
        name={added ? 'checkmark' : 'add'}
        size={iconSizes.md}
      />
      {added ? (
        <Text
          style={{
            color: accentContrast(),
            fontSize: fontSizes.sm,
            fontWeight: semibold,
          }}
        >
          Añadido
        </Text>
      ) : null}
    </PressableScale>
  );
}

export type RowPick = { added: boolean; onToggle: () => void };

/**
 * A catalogue row.
 *
 * The previous version showed the muscle group as one grey sentence, which is
 * why the section read as a phone book: every row looked identical at a
 * glance. The payload already carries the muscle actually targeted and the
 * body part — the facts a lifter scans for before reading a single name. Shown
 * as tags they are separable at speed, and the targeted muscle is accented
 * because it is the one people filter by in their head.
 *
 * Con `pick`, la fila sigue abriendo la ficha al tocarla y gana a la derecha el
 * botón «+» (en lugar del chevron) para añadirla a la rutina.
 */
export function ExerciseRow({
  exercise,
  onPress,
  pick,
}: {
  exercise: Exercise;
  onPress: () => void;
  pick?: RowPick;
}) {
  // Sin equipamiento. Al socio no le sirve leer «barra» en cada fila: no elige
  // el ejercicio por el hierro que necesita sino por el músculo que trabaja, y
  // esa etiqueta sólo añade ruido a una lista que ya se recorre con el pulgar.
  // El dato sigue en la API porque el gimnasio sí lo usa, en su panel.
  const tags = [
    {
      label: exercise.targetMuscle ? muscleLabelEs(exercise.targetMuscle) : exerciseGroupLabelEs(exercise.grupoMuscular),
      accent: true,
    },
    { label: bodyPartLabelEs(exercise.bodyPart), accent: false },
  ].filter((tag): tag is { label: string; accent: boolean } => Boolean(tag.label));

  const content = (
    <>
      <ExerciseImage exercise={exercise} size={64} />
      <View style={{ flex: 1, gap: spacing.xs }}>
        <Text
          numberOfLines={2}
          style={{
            color: colors.text,
            fontSize: fontSizes.md,
            fontWeight: semibold,
          }}
        >
          {exercise.nombre}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
          {tags.map((tag) => (
            <Tag accent={tag.accent} key={tag.label} label={tag.label} />
          ))}
        </View>
      </View>
    </>
  );

  const rowStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: minTouchTarget,
    paddingVertical: spacing.sm,
  } as const;

  if (pick) {
    return (
      <View style={{ ...rowStyle, gap: spacing.sm }}>
        <PressableScale
          accessibilityHint="Abre la ficha del ejercicio"
          accessibilityLabel={`${exercise.nombre}. ${tags.map((tag) => tag.label).join('. ')}`}
          onPress={onPress}
          style={{ ...rowStyle, flex: 1, paddingVertical: 0 }}
        >
          {content}
        </PressableScale>
        <PickButton
          added={pick.added}
          name={exercise.nombre}
          onToggle={pick.onToggle}
          testID={`pick-${exercise.id}`}
        />
      </View>
    );
  }

  return (
    <PressableScale
      accessibilityLabel={`${exercise.nombre}. ${tags.map((tag) => tag.label).join('. ')}`}
      onPress={onPress}
      style={rowStyle}
    >
      {content}
      <Ionicons
        accessibilityElementsHidden
        color={colors.textDisabled}
        importantForAccessibility="no-hide-descendants"
        name="chevron-forward"
        size={iconSizes.md}
      />
    </PressableScale>
  );
}
