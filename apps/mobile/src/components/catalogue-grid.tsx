import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { EnterUp, PressableScale } from '@/components/motion';
import { MuscleHero } from '@/features/body-map';
import { zoneMuscles } from '@/features/body-map/zones';
import { accentPolicy, alpha, colors, fontSizes, iconSizes, radii, semibold, shadows, spacing } from '@/theme';

/**
 * Icon per body part.
 *
 * This is presentation, not data: the taxonomy itself comes from the backend,
 * and anything it returns without an entry here still renders — with the
 * fallback glyph — instead of vanishing from the grid. That way a new body part
 * added in the catalogue never silently disappears from navigation.
 */
const BODY_PART_ICON: ReadonlyArray<readonly [RegExp, keyof typeof Ionicons.glyphMap]> = [
  // El catálogo devuelve las zonas en inglés (dataset) o en español (las que
  // definió el gimnasio: «Tren superior», «Cadena posterior»). Con una tabla
  // de nombres exactos en inglés, todas las zonas en español caían en el mismo
  // icono de reserva y la cuadrícula se leía como seis tarjetas iguales.
  [/cardio|aer[oó]bic/i, 'pulse-outline'],
  [/upper arm|brazo|b[ií]ceps|tr[ií]ceps/i, 'barbell-outline'],
  [/lower arm|antebrazo|forearm/i, 'hand-left-outline'],
  [/lower leg|pantorrilla|gemelo|calf/i, 'footsteps-outline'],
  [/upper leg|pierna|tren inferior|cu[aá]driceps|gl[uú]teo|leg/i, 'walk-outline'],
  [/cadena posterior|posterior|back|espalda|dorsal/i, 'body-outline'],
  [/chest|pecho|pectoral/i, 'shield-outline'],
  [/waist|core|abdom|cintura/i, 'ellipse-outline'],
  [/shoulder|hombro|delto/i, 'triangle-outline'],
  [/tren superior|upper/i, 'barbell-outline'],
  [/neck|cuello/i, 'accessibility-outline'],
];

const FALLBACK_ICON: keyof typeof Ionicons.glyphMap = 'fitness-outline';

export { zoneMuscles } from '@/features/body-map/zones';

const TILE_ART = 128;

/** `upper arms` → `Upper arms`. The catalogue stores them lowercase. */
export function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function iconFor(bodyPart: string): keyof typeof Ionicons.glyphMap {
  return BODY_PART_ICON.find(([pattern]) => pattern.test(bodyPart))?.[1] ?? FALLBACK_ICON;
}

/**
 * A tile in the catalogue's navigation grid.
 *
 * Two per row rather than a list: the whole point of this level is comparison
 * at a glance — a lifter picks "chest" from the shape of the grid, not by
 * reading down a column. The count is shown because "chest 163" and "neck 4"
 * set very different expectations about what is behind the tap.
 */
export function GridTile({
  icon,
  index,
  label,
  onPress,
  total,
  zone,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  /** Se ignora: el servidor puede mandar un vídeo aquí. La lámina sale de `zone`. */
  imageUrl?: string | null;
  index: number;
  label: string;
  onPress: () => void;
  total: number;
  /** Nombre de la zona o músculo en el catálogo, para encender su silueta. */
  zone?: string;
}) {
  const muscles = zone ? zoneMuscles(zone) : null;
  return (
    <EnterUp index={index} style={{ width: '48%' }}>
      <PressableScale
        accessibilityLabel={`${label}, ${total} ejercicios`}
        onPress={onPress}
        style={{
          overflow: 'hidden',
          borderRadius: radii.xl,
          borderCurve: 'continuous',
          backgroundColor: colors.surfaceLow,
          boxShadow: shadows.card,
        }}
      >
        {/* La figura con la zona encendida: se elige con el ojo, no leyendo. */}
        <View style={{ height: TILE_ART, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceLowest }}>
          {muscles ? (
            <View style={{ alignSelf: 'stretch' }}>
              <MuscleHero codes={muscles} height={TILE_ART} padding={1.35} />
            </View>
          ) : (
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: radii.full,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: alpha(colors.volt, 0.16),
              }}
            >
              <Ionicons color={colors.accentInk} name={icon} size={iconSizes.lg} />
            </View>
          )}
          <LinearGradient
            colors={[alpha(colors.surfaceLow, 0), colors.surfaceLow]}
            pointerEvents="none"
            style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 28 }}
          />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingTop: spacing.xs, paddingBottom: spacing.md }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text numberOfLines={1} style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: '700', letterSpacing: -0.2 }}>
              {label}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs, fontVariant: ['tabular-nums'] }}>
              {`${total} ${total === 1 ? 'ejercicio' : 'ejercicios'}`}
            </Text>
          </View>
          <Ionicons color={colors.textMuted} name="chevron-forward" size={iconSizes.sm} />
        </View>
      </PressableScale>
    </EnterUp>
  );
}

/** Two-column wrapper; `space-between` keeps the last odd tile left-aligned. */
export function Grid({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        rowGap: spacing.sm,
      }}
    >
      {children}
    </View>
  );
}

/** Breadcrumb back control for the drill-down. */
export function DrillBack({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <PressableScale
      accessibilityLabel={`Volver a ${label}`}
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingVertical: 4 }}
    >
      <Ionicons color={accentPolicy.quietLink} name="chevron-back" size={iconSizes.md} />
      <Text style={{ color: accentPolicy.quietLink, fontSize: fontSizes.sm, fontWeight: semibold }}>
        {label}
      </Text>
    </PressableScale>
  );
}
