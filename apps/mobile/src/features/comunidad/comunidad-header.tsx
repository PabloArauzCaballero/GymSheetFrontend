import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ReppLogo } from '@/components/brand/repp-mark';
import { PressableScale } from '@/components/motion';
import { colors, fontSizes, iconSizes, minTouchTarget, radii, spacing } from '@/theme';

/** Screen gutter shared by the header and the deck, so the card edges line up with the buttons above. */
export const COMUNIDAD_GUTTER = spacing.md;

export type DeckPill = 'foryou' | 'goal' | 'branch';

/** Round header button: 44 pt target, quiet surface; `active` draws the outline and the dot in the accent. */
function HeaderButton({
  active = false,
  icon,
  label,
  onPress,
}: {
  active?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <PressableScale
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        width: minTouchTarget,
        height: minTouchTarget,
        borderRadius: radii.full,
        backgroundColor: colors.surfaceHigh,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: active ? colors.volt : colors.borderSubtle,
      }}
    >
      <Ionicons color={active ? colors.volt : colors.text} name={icon} size={iconSizes.md} />
      {active ? (
        <View
          style={{
            position: 'absolute',
            top: spacing.sm,
            right: spacing.sm,
            width: spacing.sm - 1,
            height: spacing.sm - 1,
            borderRadius: radii.full,
            backgroundColor: colors.volt,
          }}
        />
      ) : null}
    </PressableScale>
  );
}

function PillOption({ label, onPress, selected }: { label: string; onPress: () => void; selected: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{
        // Grow from the label's own width (not equal halves) so «Mismo objetivo» stays on one line at 320; and
        // shrink (RN's default is 0) so at XL text it wraps inside the switch instead of running past the screen.
        flexGrow: 1,
        flexShrink: 1,
        minHeight: minTouchTarget,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing.smd,
        // Air above and below once the label wraps (Dynamic Type XL, ≥ 12 as on the web); at default size
        // minHeight decides.
        paddingVertical: spacing.smd,
        borderRadius: radii.full,
        backgroundColor: selected ? colors.surfaceHigh : 'transparent',
      }}
    >
      {/* Chrome, not content: grows with Dynamic Type up to ×1.4 (the web caps it too), so the room goes to the card. */}
      <Text
        maxFontSizeMultiplier={1.4}
        style={{
          textAlign: 'center',
          color: selected ? colors.text : colors.textMuted,
          fontSize: fontSizes.sm,
          fontWeight: selected ? '700' : '500',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * Comunidad's header: the REPP wordmark with filters and «⋯» on one line, and
 * the deck switch under it. Same gutter as the deck, 8 between the round
 * buttons, 12 between the two rows and 12 down to the card.
 */
export function ComunidadHeader({
  filtersActive,
  onForYou,
  onGoal,
  onOpenFilters,
  onOpenOverflow,
  pill,
}: {
  filtersActive: boolean;
  onForYou: () => void;
  onGoal: () => void;
  onOpenFilters: () => void;
  onOpenOverflow: () => void;
  pill: DeckPill;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        paddingTop: insets.top + spacing.sm,
        paddingHorizontal: COMUNIDAD_GUTTER,
        paddingBottom: spacing.smd,
        gap: spacing.smd,
        zIndex: 10,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }}>
        <ReppLogo height={24} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <HeaderButton active={filtersActive} icon="options-outline" label="Preferencias de búsqueda" onPress={onOpenFilters} />
          <HeaderButton icon="ellipsis-horizontal" label="Opciones de Comunidad" onPress={onOpenOverflow} />
        </View>
      </View>
      <View
        style={{
          // The card's full width, as on the web. Both options share the taller one's height when a label wraps.
          flexDirection: 'row',
          alignItems: 'stretch',
          backgroundColor: colors.surfaceLow,
          padding: spacing.xs,
          borderRadius: radii.full,
          borderWidth: 1,
          borderColor: colors.borderSubtle,
          gap: spacing.xs,
        }}
      >
        <PillOption label="Para ti" onPress={onForYou} selected={pill === 'foryou'} />
        <PillOption label="Mismo objetivo" onPress={onGoal} selected={pill === 'goal'} />
      </View>
    </View>
  );
}
