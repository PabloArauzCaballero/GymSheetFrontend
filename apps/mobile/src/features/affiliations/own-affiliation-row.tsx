import { affiliationChip, affiliationCopy, affiliationKindLabels, affiliationReasonText, formatDate, ownAffiliationAction } from '@gymsheet/domain';
import type { Affiliation } from '@gymsheet/schemas';
import { View } from 'react-native';
import { Badge, Card } from '@/components/layout';
import { Text } from '@/components/text';
import { Button } from '@/components/ui';
import { confirm } from '@/notifications';
import { spacing } from '@/theme';

/** One own affiliation (person) or gym link (coach): gym, state, why it closed, and cancel or leave. */
export function OwnAffiliationRow({ row, busy, onClose, coach = false }: { row: Affiliation; busy: boolean; onClose: (row: Affiliation) => void; coach?: boolean }) {
  const chip = affiliationChip(row);
  const action = ownAffiliationAction(row);
  const reason = affiliationReasonText(row.reasonCode, row.reasonNote);
  const label = action === 'cancel' ? affiliationCopy.cancel : row.kind === 'SOCIO' ? affiliationCopy.leave : affiliationCopy.leaveCoach;
  async function ask() {
    const answer = await confirm({ title: `${label}: ${row.gym.name}`, message: action === 'cancel' ? 'El gimnasio ya no la verá.' : 'El gimnasio deja de contarte.', confirmLabel: label, cancelLabel: 'Volver' });
    if (answer.confirmed) onClose(row);
  }
  const meta = [coach ? (row.gym.handle ? `@${row.gym.handle}` : null) : affiliationKindLabels[row.kind], row.location?.name, `pedida el ${formatDate(row.requestedAt)}`];
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
        <Text numberOfLines={1} strong style={{ flex: 1 }} variant="body">{row.gym.name}</Text>
        <Badge label={chip.label} tone={chip.tone} />
      </View>
      <Text tone="secondary" variant="subhead">{meta.filter(Boolean).join(' · ')}</Text>
      {reason ? <Text variant="subhead">{reason}</Text> : null}
      {action ? <Button label={label} loading={busy} onPress={() => void ask()} size="sm" variant="ghost" /> : null}
    </Card>
  );
}
