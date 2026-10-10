import { View } from 'react-native';
import type { Exercise } from '@gymsheet/types';
import { ExerciseImage } from '@/components/media';
import { colors, radii, shadows, spacing } from '@/theme';

type CoverExercise = Pick<Exercise, 'id' | 'media' | 'nombre' | 'grupoMuscular'>;

/**
 * Portada del detalle (C8.3.1): un mosaico con las láminas de los tres primeros
 * ejercicios. La propia rutina es su imagen, sin depender de fotos de stock.
 * Decorativa para el lector de pantalla: el título dice qué es.
 */
export function DetailCover({ exercises }: { exercises: readonly CoverExercise[] }) {
  if (exercises.length === 0) return null;
  const [first, second, third] = exercises;
  const tile = { flex: 1, borderRadius: radii.lg, overflow: 'hidden' as const };
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        flexDirection: 'row',
        gap: spacing.sm,
        height: 196,
        padding: spacing.sm,
        borderRadius: radii.xxl,
        borderCurve: 'continuous',
        backgroundColor: colors.surfaceHigh,
        boxShadow: shadows.e2,
      }}
    >
      <View style={[tile, { flex: second ? 1.25 : 1 }]}>
        {first ? <ExerciseImage exercise={first} rounded={radii.lg} size="fill" /> : null}
      </View>
      {second ? (
        <View style={{ flex: 1, gap: spacing.sm }}>
          <View style={tile}>
            <ExerciseImage exercise={second} rounded={radii.lg} size="fill" />
          </View>
          {third ? (
            <View style={tile}>
              <ExerciseImage exercise={third} rounded={radii.lg} size="fill" />
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
