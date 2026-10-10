import { Text, View } from 'react-native';
import { cardSubtitle, copiesLabel, ratingLabel } from '@gymsheet/hooks';
import type { Routine } from '@gymsheet/types';
import { Badge, ScreenHeader } from '@/components/layout';
import { GOAL_LABEL } from '@/lib/format';
import { colors, fontSizes, spacing } from '@/theme';

/** Cabecera del detalle: nombre, objetivo, días/semana, duración, autor y valoración. */
export function DetailHeader({ routine }: { routine: Routine }) {
  const subtitle = cardSubtitle({
    diasPorSemana: routine.dias.length,
    duracionSemanas: routine.duracionSemanas,
  });
  return (
    <View style={{ gap: spacing.sm }}>
      <ScreenHeader detail subtitle={routine.descripcion ?? undefined} title={routine.nombre} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm }}>
        {routine.esOficial ? <Badge label="Recomendada por REPP" tone="success" /> : null}
        {routine.objetivo ? <Badge label={GOAL_LABEL[routine.objetivo]} tone="info" /> : null}
        <Badge label={subtitle} />
        {routine.visibilidad === 'PUBLIC' ? <Badge label="Pública" /> : null}
      </View>
      {routine.atribucion ? (
        <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }} testID="attribution">
          Basada en <Text style={{ color: colors.text }}>{routine.atribucion.routineName}</Text> de{' '}
          {routine.atribucion.authorName}
        </Text>
      ) : null}
      {routine.visibilidad === 'PUBLIC' || routine.copias > 0 ? (
        <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>
          {ratingLabel(routine.valoracion)} · {copiesLabel(routine.copias)}
        </Text>
      ) : null}
    </View>
  );
}
