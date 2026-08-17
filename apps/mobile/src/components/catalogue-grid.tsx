import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EnterUp, PressableScale } from '@/components/motion';
import { colors, fontSizes, iconSizes, radii, spacing } from '@/theme';

/**
 * Icon per body part.
 *
 * This is presentation, not data: the taxonomy itself comes from the backend,
 * and anything it returns without an entry here still renders — with the
 * fallback glyph — instead of vanishing from the grid. That way a new body part
 * added in the catalogue never silently disappears from navigation.
 */
const BODY_PART_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  'upper arms': 'barbell-outline',
  'lower arms': 'hand-left-outline',
  'upper legs': 'walk-outline',
  'lower legs': 'footsteps-outline',
  back: 'body-outline',
  chest: 'heart-outline',
  waist: 'ellipse-outline',
  shoulders: 'triangle-outline',
  cardio: 'pulse-outline',
  neck: 'accessibility-outline',
};

const FALLBACK_ICON: keyof typeof Ionicons.glyphMap = 'fitness-outline';

/** `upper arms` → `Upper arms`. The catalogue stores them lowercase. */
export function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function iconFor(bodyPart: string): keyof typeof Ionicons.glyphMap {
  return BODY_PART_ICON[bodyPart.toLowerCase()] ?? FALLBACK_ICON;
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
}: {
  icon: keyof typeof Ionicons.glyphMap;
  index: number;
  label: string;
  onPress: () => void;
  total: number;
}) {
  return (
    <EnterUp index={index} style={{ width: '48%' }}>
      <PressableScale
        accessibilityLabel={`${label}, ${total} ejercicios`}
        onPress={onPress}
        style={{
          gap: spacing.sm,
          padding: spacing.md,
          minHeight: 116,
          justifyContent: 'space-between',
          borderRadius: radii.lg,
          borderWidth: 1,
          borderColor: colors.borderSubtle,
          borderTopColor: colors.border,
          backgroundColor: colors.surface,
        }}
      >
        <Ionicons color={colors.volt} name={icon} size={iconSizes.xl} />
        <View style={{ gap: 2 }}>
          <Text
            numberOfLines={2}
            style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: '700' }}
          >
            {label}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>
            {`${total} ${total === 1 ? 'ejercicio' : 'ejercicios'}`}
          </Text>
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
      <Ionicons color={colors.accentInk} name="chevron-back" size={iconSizes.md} />
      <Text style={{ color: colors.accentInk, fontSize: fontSizes.sm, fontWeight: '600' }}>
        {label}
      </Text>
    </PressableScale>
  );
}
