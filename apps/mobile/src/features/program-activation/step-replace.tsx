import { Text, View } from 'react-native';
import type { Program } from '@gymsheet/types';
import { Button } from '@/components/ui';
import { colors, fontSizes, radii, semibold, spacing } from '@/theme';

/** A1 · Reemplazo: solo si ya hay un programa de pesas activo. El cardio no se toca. */
export function ReplaceStep({
  active,
  routineName,
  hasCardio,
  onReplace,
  onCancel,
}: {
  active: Program;
  routineName: string;
  hasCardio: boolean;
  onReplace: () => void;
  onCancel: () => void;
}) {
  return (
    <View style={{ gap: spacing.md }}>
      <View style={{ gap: spacing.sm, borderRadius: radii.lg, backgroundColor: colors.surfaceLow, padding: spacing.md }}>
        <Text style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: semibold, lineHeight: 24 }} testID="replace-question">
          Ya tienes «{active.rutinaNombre ?? 'un programa'}» activa (semana {active.semanaActual ?? 1} de {active.semanasTotales}).
          ¿Apagarla y activar «{routineName}»?
        </Text>
        {hasCardio ? (
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>Tu plan de cardio sigue activo.</Text>
        ) : null}
      </View>
      <Button label="Apagar y activar" onPress={onReplace} />
      <Button label="Cancelar" onPress={onCancel} variant="ghost" />
    </View>
  );
}
