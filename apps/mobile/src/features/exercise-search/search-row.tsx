import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { ActivityIndicator, View } from 'react-native';
import type { Exercise } from '@gymsheet/types';
import { equipmentLabelEs, exerciseGroupLabelEs, muscleLabelEs } from '@gymsheet/domain';
import { ExerciseImage } from '@/components/media';
import { Pop, PressableScale } from '@/components/motion';
import { Text } from '@/components/text';
import { displayName, highlightParts } from '@/features/exercise-search/search-text';
import { accentContrast, colors, iconSizes, minTouchTarget, radii, spacing } from '@/theme';

/** Alto fijo de la fila: la lista virtualizada sabe dónde cae cada una sin medirla. */
export const SEARCH_ROW_HEIGHT = 80;
const THUMB = 56;

export type RowTrailing = 'open' | 'pick' | 'select';

/** «Glúteos · Barra»: lo que se mira antes de leer el nombre. */
function factsOf(exercise: Exercise): string {
  const muscle = exercise.targetMuscle
    ? muscleLabelEs(exercise.targetMuscle)
    : exerciseGroupLabelEs(exercise.grupoMuscular);
  const equipment = exercise.requiredEquipment ? equipmentLabelEs(exercise.requiredEquipment) : '';
  return [muscle, equipment].filter(Boolean).join(' · ');
}

/**
 * El «+» de la fila. Al añadir se convierte en ✓ con un salto corto (el toque
 * ya lleva su háptico); mientras se guarda gira y no admite un segundo toque.
 */
function AddButton({
  added,
  busy,
  name,
  onPress,
  testID,
}: {
  added: boolean;
  busy: boolean;
  name: string;
  onPress: () => void;
  testID: string;
}) {
  if (busy) {
    return (
      <View
        accessibilityLabel={`Añadiendo ${name}`}
        accessible
        style={{ width: minTouchTarget, height: minTouchTarget, alignItems: 'center', justifyContent: 'center' }}
      >
        <ActivityIndicator color={colors.accentInk} />
      </View>
    );
  }
  return (
    <Pop trigger={added}>
      <PressableScale
        accessibilityLabel={added ? `${name}, añadido. Toca para quitarlo` : `Añadir ${name}`}
        accessibilityRole="button"
        accessibilityState={{ selected: added }}
        haptic="selection"
        hitSlop={spacing.sm}
        onPress={onPress}
        scaleTo={0.9}
        style={{
          width: minTouchTarget,
          height: minTouchTarget,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: radii.full,
          borderWidth: 1.5,
          borderColor: added ? colors.volt : colors.accentInk,
          backgroundColor: added ? colors.volt : 'transparent',
        }}
        testID={testID}
      >
        <Ionicons
          accessibilityElementsHidden
          color={added ? accentContrast() : colors.accentInk}
          importantForAccessibility="no-hide-descendants"
          name={added ? 'checkmark' : 'add'}
          size={iconSizes.md}
        />
      </PressableScale>
    </Pop>
  );
}

/**
 * Una fila del buscador: miniatura real, nombre en español con lo buscado
 * resaltado, músculo y equipo, y a la derecha lo que toca según el sitio
 * (abrir la ficha, «+» del asistente o «+» del entreno).
 *
 * Es `memo` y recibe funciones estables: añadir un ejercicio solo repinta su fila.
 */
export const SearchRow = memo(function SearchRow({
  exercise,
  query,
  trailing,
  added,
  busy,
  onOpen,
  onAdd,
}: {
  exercise: Exercise;
  query: string;
  trailing: RowTrailing;
  added: boolean;
  busy: boolean;
  onOpen: (exercise: Exercise) => void;
  onAdd: (exercise: Exercise) => void;
}) {
  const name = displayName(exercise);
  const facts = factsOf(exercise);
  const parts = highlightParts(name, query);

  return (
    <View
      style={{
        height: SEARCH_ROW_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
      }}
    >
      <PressableScale
        accessibilityHint={trailing === 'select' ? 'Lo añade al entreno' : 'Abre la ficha del ejercicio'}
        accessibilityLabel={[name, facts, added ? 'Añadido' : ''].filter(Boolean).join('. ')}
        accessibilityRole="button"
        disabled={busy}
        onPress={() => (trailing === 'select' ? onAdd(exercise) : onOpen(exercise))}
        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: minTouchTarget }}
        testID={`search-row-${exercise.id}`}
      >
        <ExerciseImage exercise={exercise} rounded={radii.md} size={THUMB} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text numberOfLines={2} variant="headline">
            {parts.map((part, index) =>
              part.match ? (
                <Text key={index} tone="accent" variant="headline">
                  {part.text}
                </Text>
              ) : (
                part.text
              ),
            )}
          </Text>
          {facts ? (
            <Text numberOfLines={1} tone="muted" variant="footnote">
              {facts}
            </Text>
          ) : null}
        </View>
      </PressableScale>

      {trailing === 'open' ? (
        <Ionicons
          accessibilityElementsHidden
          color={colors.textMuted}
          importantForAccessibility="no-hide-descendants"
          name="chevron-forward"
          size={iconSizes.md}
        />
      ) : (
        <AddButton
          added={added}
          busy={busy}
          name={name}
          onPress={() => onAdd(exercise)}
          testID={`pick-${exercise.id}`}
        />
      )}
    </View>
  );
});
