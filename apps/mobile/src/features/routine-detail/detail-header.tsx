import { View } from 'react-native';
import { cardSubtitle, copiesLabel, ratingLabel } from '@gymsheet/hooks';
import type { Routine } from '@gymsheet/types';
import { FactChips, type Fact } from '@/components/fact-chips';
import { Badge } from '@/components/layout';
import { Text } from '@/components/text';
import { GOAL_LABEL } from '@/lib/format';
import { spacing } from '@/theme';
import { routineMinutes } from '@/features/routine-detail/routine-plan';

/**
 * Cabecera del detalle: insignias (REPP, objetivo), título display, hechos
 * (días/sem, semanas, ≈min), autoría y valoración. Cada dato se dice una vez.
 */
export function DetailHeader({ routine, authorName }: { routine: Routine; authorName?: string | null }) {
  const days = routine.dias.length;
  const minutes = routineMinutes(routine);
  const facts: Fact[] = [
    { key: 'days', icon: 'calendar-outline', label: `${days} ${days === 1 ? 'día' : 'días'}/sem` },
    ...(routine.duracionSemanas
      ? [{ key: 'weeks', icon: 'layers-outline' as const, label: `${routine.duracionSemanas} semanas` }]
      : []),
    ...(minutes > 0 ? [{ key: 'min', icon: 'time-outline' as const, label: `≈${minutes} min` }] : []),
  ];
  const showRating = routine.visibilidad === 'PUBLIC' || routine.copias > 0;
  return (
    <View style={{ gap: spacing.smd }}>
      {routine.esOficial || routine.objetivo || routine.visibilidad === 'PUBLIC' ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {routine.esOficial ? <Badge label="Recomendada por REPP" tone="success" /> : null}
          {routine.objetivo ? <Badge label={GOAL_LABEL[routine.objetivo]} tone="info" /> : null}
          {routine.visibilidad === 'PUBLIC' && !routine.esOficial ? <Badge label="Pública" /> : null}
        </View>
      ) : null}
      <Text accessibilityLabel={`${routine.nombre}. ${cardSubtitle({ diasPorSemana: days, duracionSemanas: routine.duracionSemanas })}`} accessibilityRole="header" numberOfLines={3} testID="routine-title" variant="display">
        {routine.nombre}
      </Text>
      <FactChips facts={facts} />
      {routine.atribucion ? (
        <Text testID="attribution" tone="secondary" variant="subhead">
          Basada en <Text strong variant="subhead">{routine.atribucion.routineName}</Text> de{' '}
          {routine.atribucion.authorName}
        </Text>
      ) : authorName && !routine.esMia ? (
        <Text tone="secondary" variant="subhead">
          Creada por <Text strong variant="subhead">{authorName}</Text>
        </Text>
      ) : null}
      {showRating ? (
        <Text tabular tone="muted" variant="footnote">
          {`${ratingLabel(routine.valoracion)} · ${copiesLabel(routine.copias)}`}
        </Text>
      ) : null}
      {routine.descripcion ? (
        <Text selectable tone="secondary" variant="body">
          {routine.descripcion}
        </Text>
      ) : null}
    </View>
  );
}
