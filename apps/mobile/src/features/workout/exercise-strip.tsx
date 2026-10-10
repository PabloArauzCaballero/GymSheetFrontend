import { Ionicons } from '@expo/vector-icons';
import { FlatList, View } from 'react-native';
import type { Exercise } from '@gymsheet/types';
import { ExerciseImage } from '@/components/media';
import { PressableScale } from '@/components/motion';
import { Text } from '@/components/text';
import { colors, iconSizes, radii, spacing } from '@/theme';

export type StripItem = {
  id: string;
  name: string;
  exercise: Pick<Exercise, 'media' | 'nombre' | 'grupoMuscular'> | null;
  done: boolean;
};

const THUMB = 44;

/**
 * La tira de arriba del entreno (C8.3.3, patrón 10 de las referencias):
 * «Siguiente: …» en texto y las miniaturas de toda la sesión en orden, con el
 * actual subrayado y ✓ en lo hecho. Tocar una miniatura la pasa a actual.
 */
export function ExerciseStrip({
  items,
  currentId,
  next,
  onSelect,
}: {
  items: readonly StripItem[];
  currentId: string | null;
  /** «Remo con mancuerna · vuelta 2» o `null` si es lo último. */
  next: string | null;
  onSelect: (id: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <View style={{ gap: spacing.sm }}>
      <Text numberOfLines={1} testID="up-next" tone="secondary" variant="subhead">
        {next ? (
          <>
            {'Siguiente: '}
            <Text strong variant="subhead">
              {next}
            </Text>
          </>
        ) : (
          'Último ejercicio'
        )}
      </Text>
      <FlatList
        contentContainerStyle={{ gap: spacing.sm }}
        data={items}
        horizontal
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => {
          const current = item.id === currentId;
          return (
            <PressableScale
              accessibilityLabel={`${index + 1}. ${item.name}${item.done ? ', hecho' : ''}${current ? ', actual' : ''}`}
              accessibilityState={{ selected: current }}
              haptic="selection"
              onPress={() => onSelect(item.id)}
              scaleTo={0.94}
              style={{ alignItems: 'center', gap: spacing.xs, paddingBottom: spacing.xxs }}
              testID={`strip-${index + 1}`}
            >
              <View style={{ opacity: item.done && !current ? 0.55 : 1 }}>
                {item.exercise ? (
                  <ExerciseImage exercise={item.exercise} rounded={radii.sm} size={THUMB} />
                ) : (
                  <View style={{ width: THUMB, height: THUMB, borderRadius: radii.sm, backgroundColor: colors.surfaceHighest }} />
                )}
                {item.done ? (
                  <View style={{ position: 'absolute', right: -spacing.xs, bottom: -spacing.xs, borderRadius: radii.full, backgroundColor: colors.background }}>
                    <Ionicons color={colors.success} name="checkmark-circle" size={iconSizes.sm} />
                  </View>
                ) : null}
              </View>
              <View
                style={{
                  width: THUMB - spacing.md,
                  height: 3,
                  borderRadius: radii.full,
                  backgroundColor: current ? colors.text : 'transparent',
                }}
              />
            </PressableScale>
          );
        }}
        showsHorizontalScrollIndicator={false}
      />
    </View>
  );
}
