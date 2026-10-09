import { Text, View } from 'react-native';
import { formatKg } from '@gymsheet/hooks';
import type { LiftTargetView } from '@gymsheet/types';
import { colors, fontSizes, radii, semibold, spacing } from '@/theme';

/** Fracción (0–1) del camino entre la marca inicial y la meta. */
export function goalFraction(lift: Pick<LiftTargetView, 'marcaInicialKg' | 'marcaActualKg' | 'marcaMetaKg'>): number {
  const { marcaInicialKg: start, marcaActualKg: now, marcaMetaKg: goal } = lift;
  if (start === null || now === null || goal === null || goal <= start) return 0;
  return Math.min(Math.max((now - start) / (goal - start), 0), 1);
}

/** Barra hacia la meta (RF-16): «Press banca · 116,7 → 125 kg» con el avance en % y en texto. */
export function GoalProgress({ lift }: { lift: LiftTargetView }) {
  const fraction = goalFraction(lift);
  const reached = lift.alcanzadaEn !== null;
  const percent = Math.round(fraction * 100);
  return (
    <View
      accessibilityLabel={`${lift.ejercicioNombre ?? 'Levantamiento'}. Marca actual ${lift.marcaActualKg !== null ? formatKg(lift.marcaActualKg) : 'sin marca'}, meta ${lift.marcaMetaKg !== null ? formatKg(lift.marcaMetaKg) : 'sin meta'}. ${reached ? 'Meta lograda' : `${percent} por ciento`}`}
      style={{ gap: spacing.xs }}
      testID={`goal-${lift.ejercicioId}`}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm }}>
        <Text numberOfLines={1} style={{ flex: 1, color: colors.text, fontSize: fontSizes.sm, fontWeight: semibold }}>
          {lift.ejercicioNombre ?? 'Levantamiento'}
        </Text>
        <Text style={{ color: reached ? colors.success : colors.textMuted, fontSize: fontSizes.sm }}>
          {reached ? '✓ Meta lograda' : `${percent} %`}
        </Text>
      </View>
      <View style={{ height: 8, borderRadius: radii.full, backgroundColor: colors.surfaceHigh, overflow: 'hidden' }}>
        <View style={{ width: `${Math.max(percent, reached ? 100 : 2)}%`, height: 8, backgroundColor: reached ? colors.success : colors.volt }} />
      </View>
      <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>
        {lift.marcaActualKg !== null ? formatKg(lift.marcaActualKg) : 'Sin marca'} → {lift.marcaMetaKg !== null ? formatKg(lift.marcaMetaKg) : '—'}
        {lift.fechaMeta ? ` · para el ${lift.fechaMeta}` : ''}
      </Text>
    </View>
  );
}
