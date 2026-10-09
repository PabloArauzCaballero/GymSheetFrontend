import { Text, View } from 'react-native';
import { cardioProgressLabel } from '@gymsheet/hooks';
import type { CardioSessionBlock } from '@gymsheet/schemas';
import { Card } from '@/components/layout';
import { colors, fontSizes, semibold, spacing } from '@/theme';

/** Lo que dice el plan de cardio al terminar la sesión (RF-17): minutos que cuentan y avance semanal. */
export function SessionCardioBlock({ block }: { block: CardioSessionBlock }) {
  return (
    <Card>
      <View style={{ gap: spacing.sm }} testID="session-cardio">
        <Text style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: semibold }}>Tu cardio</Text>
        <Text style={{ color: block.sesionCuenta ? colors.volt : colors.textMuted, fontSize: fontSizes.md, fontWeight: semibold }}>
          {block.sesionCuenta ? `Cuentan ${Math.round(block.minutosCuentan)} min` : 'Esta sesión no cuenta (mínimo 10 min)'}
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }} testID="cardio-week-progress">
          Semana {block.semana ?? '—'}: {cardioProgressLabel(block)}
        </Text>
        <Text style={{ color: block.cumpleObjetivoSesion ? colors.success : colors.textMuted, fontSize: fontSizes.sm }}>
          {block.cumpleObjetivoSesion ? '✓ Cumpliste el objetivo de la sesión' : `Objetivo de la sesión: ${block.objetivoMinutosSesion} min`}
        </Text>
        {block.consejo?.reason ? (
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>{block.consejo.reason}</Text>
        ) : null}
      </View>
    </Card>
  );
}
