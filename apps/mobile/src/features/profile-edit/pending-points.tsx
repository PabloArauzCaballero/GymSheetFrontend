import type { ProfileCompletion } from '@gymsheet/schemas';
import { pendingProfileItems } from '@gymsheet/domain';
import { View } from 'react-native';
import { Text } from '@/components/text';
import { PointsChip } from '@/features/profile-hero/completion-nudge';
import { spacing } from '@/theme';

/**
 * Lo que una sección todavía paga, dicho dentro de la propia sección: quien
 * llega desde el empujón ve aquí la misma cifra que le prometió el perfil.
 */
export function PendingPoints({ completion, codes }: { completion: ProfileCompletion | undefined; codes: readonly string[] }) {
  const pending = pendingProfileItems(completion?.items ?? []).filter((item) => codes.includes(item.code));
  if (pending.length === 0) return null;
  return (
    <View style={{ gap: spacing.xs }}>
      {pending.map((item) => (
        <View key={item.code} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <PointsChip points={item.points} />
          <Text style={{ flex: 1 }} tone="secondary" variant="footnote">
            {item.label}
          </Text>
        </View>
      ))}
    </View>
  );
}
