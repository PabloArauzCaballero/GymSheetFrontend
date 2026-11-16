import type { ProfileCompletion } from '@gymsheet/schemas';
import { noOrphan, pendingProfileItems } from '@gymsheet/domain';
import { useWindowDimensions, View } from 'react-native';
import { Text } from '@/components/text';
import { PointsChip } from '@/features/profile-hero/completion-nudge';
import { spacing } from '@/theme';

/**
 * Lo que una sección todavía paga, dicho dentro de la propia sección: quien
 * llega desde el empujón ve aquí la misma cifra que le prometió el perfil.
 */
export function PendingPoints({ completion, codes }: { completion: ProfileCompletion | undefined; codes: readonly string[] }) {
  const pending = pendingProfileItems(completion?.items ?? []).filter((item) => codes.includes(item.code));
  // Gluing the last word only at normal sizes: with Dynamic Type XL «primera foto» as one unit was wider than
  // the room beside the chip and ran past the card's edge.
  const { fontScale } = useWindowDimensions();
  // At XL the chip goes above its label: beside it the label was one word per line.
  const large = fontScale > 1.3;
  const wrap = large ? (text: string) => text : noOrphan;
  if (pending.length === 0) return null;
  return (
    <View style={{ gap: large ? spacing.sm : spacing.xs }}>
      {pending.map((item) => (
        <View key={item.code} style={{ flexDirection: large ? 'column' : 'row', alignItems: large ? 'flex-start' : 'center', gap: large ? spacing.xs : spacing.sm }}>
          <PointsChip points={item.points} />
          <Text style={large ? { alignSelf: 'stretch' } : { flex: 1 }} tone="secondary" variant="footnote">
            {wrap(item.label)}
          </Text>
        </View>
      ))}
    </View>
  );
}
