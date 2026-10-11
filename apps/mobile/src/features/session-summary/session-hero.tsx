import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import type { SessionComparison } from '@gymsheet/domain';
import type { Fact } from '@/components/fact-chips';
import { Text, type TextTone } from '@/components/text';
import { cardGap, colors, iconSizes, radii, shadows, spacing, tones } from '@/theme';

function comparisonCopy(comparison: SessionComparison | null): { text: string; tone: TextTone; icon: keyof typeof Ionicons.glyphMap } {
  if (!comparison) return { text: 'Aún no hay otra sesión con la que compararla.', tone: 'muted', icon: 'remove' };
  if (comparison.direction === 'flat') return { text: 'El mismo volumen que tu última sesión.', tone: 'secondary', icon: 'remove' };
  const pct = `${Math.abs(comparison.changePct)} %`;
  return comparison.direction === 'up'
    ? { text: `+${pct} frente a tu última sesión`, tone: 'default', icon: 'trending-up' }
    : { text: `−${pct} frente a tu última sesión`, tone: 'secondary', icon: 'trending-down' };
}

/**
 * Lo que movió la sesión, de un vistazo (C8.3.6): el volumen como cifra
 * principal, su comparación con la sesión anterior y los hechos (duración,
 * series, ejercicios). Neutro: el acento queda para el récord y la acción.
 */
export function SessionHero({
  volumeKg,
  sets,
  exercises,
  duration,
  comparison,
}: {
  volumeKg: number;
  sets: number;
  exercises: number | null;
  duration: string | null;
  comparison: SessionComparison | null;
}) {
  const copy = comparisonCopy(comparison);
  const candidates: (Fact | null)[] = [
    duration ? { key: 'duracion', icon: 'time-outline', label: duration } : null,
    { key: 'series', icon: 'layers-outline', label: `${sets} ${sets === 1 ? 'serie' : 'series'}` },
    exercises !== null ? { key: 'ejercicios', icon: 'barbell-outline', label: `${exercises} ${exercises === 1 ? 'ejercicio' : 'ejercicios'}` } : null,
  ];
  const facts = candidates.filter((fact): fact is Fact => fact !== null);
  const up = comparison?.direction === 'up';
  return (
    <View
      style={{
        gap: cardGap,
        padding: spacing.mdl,
        borderRadius: radii.xxl,
        borderCurve: 'continuous',
        backgroundColor: colors.surfaceRaised,
        boxShadow: shadows.e2,
      }}
      testID="session-hero"
    >
      <Text tone="muted" variant="footnote">
        Volumen movido
      </Text>
      <Text accessibilityLabel={`${Math.round(volumeKg)} kilos de volumen`} tabular variant="display">
        {`${Math.round(volumeKg).toLocaleString('es-ES')} kg`}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
        <Ionicons
          accessibilityElementsHidden
          color={up ? tones.dark.success.text : colors.textMuted}
          importantForAccessibility="no-hide-descendants"
          name={copy.icon}
          size={iconSizes.sm}
        />
        <Text style={{ flex: 1 }} tabular tone={copy.tone} variant="subhead">
          {copy.text}
        </Text>
      </View>
      <Text tabular tone="secondary" variant="subhead">
        {facts.map((fact) => fact.label).join(' · ')}
      </Text>
    </View>
  );
}
