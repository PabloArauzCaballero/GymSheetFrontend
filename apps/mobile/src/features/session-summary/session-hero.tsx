import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import type { SessionComparison } from '@gymsheet/domain';
import { HeroSurface } from '@/components/hero-surface';
import { Text } from '@/components/text';
import { RecordSeal } from '@/features/session-summary/session-records';
import { alpha, colors, iconSizes, radii, spacing, tones } from '@/theme';

type ChipCopy = { text: string; up: boolean; icon: keyof typeof Ionicons.glyphMap };

/** La comparación con la sesión anterior, dicha en una ficha corta. */
function comparisonChip(comparison: SessionComparison | null): ChipCopy {
  if (!comparison) return { text: 'Tu primera para comparar', up: false, icon: 'flag-outline' };
  if (comparison.direction === 'flat') return { text: 'Igual que tu última sesión', up: false, icon: 'remove' };
  const pct = `${Math.abs(comparison.changePct)} %`;
  return comparison.direction === 'up'
    ? { text: `+${pct} frente a tu última sesión`, up: true, icon: 'trending-up' }
    : { text: `−${pct} frente a tu última sesión`, up: false, icon: 'trending-down' };
}

function ComparisonChip({ comparison }: { comparison: SessionComparison | null }) {
  const chip = comparisonChip(comparison);
  // Subir es la única buena noticia que se pinta de verde; bajar o empatar
  // queda neutro: el resumen no regaña.
  const ink = chip.up ? tones.dark.success.text : colors.textSecondary;
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.smd,
        paddingVertical: spacing.xs,
        borderRadius: radii.full,
        borderWidth: 1,
        borderColor: chip.up ? tones.dark.success.border : alpha(colors.text, 0.12),
        backgroundColor: chip.up ? tones.dark.success.bg : alpha(colors.text, 0.06),
      }}
    >
      <Ionicons
        accessibilityElementsHidden
        color={ink}
        importantForAccessibility="no-hide-descendants"
        name={chip.icon}
        size={iconSizes.sm}
      />
      <Text strong style={{ color: ink }} tabular variant="footnote">
        {chip.text}
      </Text>
    </View>
  );
}

/** Una columna de hecho: la cifra arriba, su nombre debajo. */
function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View accessibilityLabel={`${value} ${label}`} accessible style={{ flex: 1, gap: spacing.xxs }}>
      <Text adjustsFontSizeToFit minimumFontScale={0.75} numberOfLines={1} variant="numeric">
        {value}
      </Text>
      <Text numberOfLines={1} tone="muted" variant="footnote">
        {label}
      </Text>
    </View>
  );
}

/**
 * La parte de arriba del resumen, la que se captura (rediseño 2026-10-18,
 * marketing-ideas #102): qué se terminó, el volumen como cifra protagonista,
 * cómo queda frente a la última sesión, los récords en oro y los tres hechos
 * en columnas. Todo cabe sin desplazarse.
 */
export function SessionHero({
  volumeKg,
  sets,
  exercises,
  duration,
  comparison,
  records,
  title,
}: {
  volumeKg: number;
  sets: number;
  exercises: number | null;
  duration: string | null;
  comparison: SessionComparison | null;
  /** Récords batidos en la sesión; 0 si no hubo o aún no se sabe. */
  records: number;
  /** Día o rutina de la sesión, si se conoce. */
  title: string | null;
}) {
  const volume = Math.round(volumeKg);
  const stats = [
    duration ? { key: 'duracion', value: duration, label: 'duración' } : null,
    { key: 'series', value: String(sets), label: sets === 1 ? 'serie' : 'series' },
    exercises !== null ? { key: 'ejercicios', value: String(exercises), label: exercises === 1 ? 'ejercicio' : 'ejercicios' } : null,
  ].filter((stat): stat is { key: string; value: string; label: string } => stat !== null);

  return (
    <HeroSurface testID="session-hero" watermark>
      <Text accessibilityRole="header" numberOfLines={2} strong tone="secondary" variant="subhead">
        {title ? `Sesión terminada · ${title}` : 'Sesión terminada'}
      </Text>

      <View style={{ gap: spacing.smd }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: spacing.sm }}>
          <Text
            accessibilityLabel={`${volume} kilos de volumen`}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            numberOfLines={1}
            variant="hero"
          >
            {volume.toLocaleString('es-ES')}
          </Text>
          <Text importantForAccessibility="no" tone="secondary" variant="title">
            kg movidos
          </Text>
        </View>
        <ComparisonChip comparison={comparison} />
      </View>

      {records > 0 ? <RecordSeal count={records} /> : null}

      <View style={{ gap: spacing.smd }}>
        <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: alpha(colors.text, 0.12) }} />
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          {stats.map((stat) => (
            <Stat key={stat.key} label={stat.label} value={stat.value} />
          ))}
        </View>
      </View>
    </HeroSurface>
  );
}
