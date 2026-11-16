import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { verifiedBadgeCopy } from '@gymsheet/domain';
import { alpha, fontSizes, ink, radii } from '@/theme';
import { CardChip } from './card-chip';
import type { CardContext } from './card-context-logic';

/** Icon plus word, never color alone; the accessible name says what the check means. */
export function VerifiedBadge() {
  return (
    <View
      accessibilityLabel={verifiedBadgeCopy.accessibleName}
      accessibilityRole="image"
      accessible
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: radii.full,
        backgroundColor: alpha(ink.black, 0.45),
        borderWidth: 1,
        borderColor: alpha(ink.white, 0.3),
      }}
    >
      <Ionicons color={ink.white} name="checkmark-circle" size={14} />
      <Text style={{ color: ink.white, fontSize: fontSizes.xs, fontWeight: '600' }}>{verifiedBadgeCopy.label}</Text>
    </View>
  );
}

/** Distance and up to three reasons. Presence never becomes a chip (see `discoveryReasonChips`). */
export function CardReasons({ context }: { context: CardContext }) {
  if (!context.distance && context.chips.length === 0) return null;
  const soft = alpha(ink.white, 0.85);
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
      {context.distance ? <CardChip icon="navigate-outline" iconColor={soft}>{context.distance}</CardChip> : null}
      {context.chips.map((chip) => (
        <CardChip icon={chip.icon} iconColor={soft} key={chip.code}>{chip.label}</CardChip>
      ))}
    </View>
  );
}
