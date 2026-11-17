import {
  affiliationNoteError,
  cancelReasonOrder,
  daysLeftText,
  formatMoney,
  sessionsText,
  subscriberFacts,
  subscriptionChip,
  subscriptionCopy,
  subscriptionReasonLabels,
  suspendReasonOrder,
} from '@gymsheet/domain';
import { queryKeys } from '@gymsheet/hooks';
import type { Subscriber, SubscriptionCancelReason, SubscriptionReason, SubscriptionSuspendReason } from '@gymsheet/schemas';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';
import { Badge, Card } from '@/components/layout';
import { PersonAvatar } from '@/components/person-avatar';
import { Text } from '@/components/text';
import { Button, Input } from '@/components/ui';
import { ChoiceChip } from '@/components/wizard/choice-chip';
import { confirm, notify } from '@/notifications';
import { spacing } from '@/theme';
import { businessSubscriptionsService, subscriptionErrorText } from './subscriptions-service';

type Mode = 'cancel' | 'suspend';

/**
 * One subscriber of «Suscriptores» (plan §2.10): name, plan, sede, end and
 * last payment, never an email or a CI. «Suspender» and «Cancelar plan» take
 * a reason chip (a note with «Otro motivo»); «Reactivar» asks once.
 */
export function SubscriberRow({ row, today }: { row: Subscriber; today: string }) {
  const client = useQueryClient();
  const [mode, setMode] = useState<Mode | null>(null);
  const [code, setCode] = useState<SubscriptionReason | null>(null);
  const [note, setNote] = useState('');
  const [tried, setTried] = useState(false);
  const chip = subscriptionChip(row.status);
  const days = daysLeftText(row);
  const extra = [sessionsText(row.sessions), row.lastPayment ? `Último pago ${formatMoney(row.lastPayment.amount, row.lastPayment.currency)}` : null].filter(Boolean).join(' · ');
  const settle = (message: string) => {
    setMode(null);
    void client.invalidateQueries({ queryKey: queryKeys.business.subscribers });
    notify.success(message);
  };
  const decide = useMutation({
    mutationFn: (reasonCode: SubscriptionReason) => {
      const body = note.trim() ? { note: note.trim() } : {};
      return mode === 'cancel'
        ? businessSubscriptionsService.cancel(row.id, { reasonCode: reasonCode as SubscriptionCancelReason, ...body })
        : businessSubscriptionsService.suspend(row.id, { reasonCode: reasonCode as SubscriptionSuspendReason, ...body });
    },
    onSuccess: () => settle(mode === 'cancel' ? subscriptionCopy.cancelled : subscriptionCopy.suspended),
  });
  const reactivate = useMutation({
    mutationFn: () => businessSubscriptionsService.reactivate(row.id),
    onSuccess: () => settle(subscriptionCopy.reactivated),
    onError: (error) => notify.error(subscriptionErrorText(error)),
  });
  async function askReactivate() {
    const answer = await confirm({ title: `¿Reactivas el plan de ${row.subscriber.displayName}?`, message: 'Vuelve a estar activo hasta su fecha de fin.', confirmLabel: subscriptionCopy.reactivate, cancelLabel: 'Todavía no' });
    if (answer.confirmed) reactivate.mutate();
  }
  const noteError = affiliationNoteError(code, note);
  const codes: readonly SubscriptionReason[] = mode === 'cancel' ? cancelReasonOrder : suspendReasonOrder;
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <PersonAvatar id={row.id} name={row.subscriber.displayName} photoUrl={null} size={48} />
        <View style={{ flex: 1, gap: spacing.xxs }}>
          <Text numberOfLines={1} strong variant="body">{row.subscriber.displayName}</Text>
          <Text tone="secondary" variant="footnote">{subscriberFacts(row, today)}</Text>
          {extra ? <Text tabular tone="secondary" variant="footnote">{extra}</Text> : null}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs }}>
            <Badge label={chip.label} tone={chip.tone} />
            {days ? <Text strong tabular variant="footnote">{days}</Text> : null}
          </View>
        </View>
      </View>
      {mode ? (
        <View style={{ gap: spacing.smd }}>
          <Text accessibilityRole="header" variant="headline">{mode === 'cancel' ? subscriptionCopy.cancelTitle : subscriptionCopy.suspendTitle}</Text>
          <Text tone="secondary" variant="footnote">{mode === 'cancel' ? subscriptionCopy.cancelFinal : subscriptionCopy.suspendHint}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {codes.map((value) => <ChoiceChip key={value} label={subscriptionReasonLabels[value]} onSelect={() => setCode(value)} selected={code === value} />)}
          </View>
          <Input error={tried && noteError ? noteError : undefined} label={code === 'OTHER' ? 'Nota para la persona' : 'Nota para la persona (opcional)'} maxLength={500} multiline onChangeText={setNote} value={note} />
          {decide.error ? <Text accessibilityRole="alert" tone="danger" variant="subhead">{subscriptionErrorText(decide.error)}</Text> : null}
          <Button label={mode === 'cancel' ? subscriptionCopy.cancel : 'Suspender plan'} loading={decide.isPending} onPress={() => { setTried(true); if (code && !noteError) decide.mutate(code); }} variant="danger" />
          <Button label="Volver" onPress={() => setMode(null)} variant="ghost" />
        </View>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {row.actions.canReactivate ? <Button label={subscriptionCopy.reactivate} loading={reactivate.isPending} onPress={() => void askReactivate()} size="sm" /> : null}
          {row.actions.canSuspend ? <Button label={subscriptionCopy.suspend} onPress={() => setMode('suspend')} size="sm" variant="ghost" /> : null}
          {row.actions.canCancel ? <Button label={subscriptionCopy.cancel} onPress={() => setMode('cancel')} size="sm" variant="ghost" /> : null}
        </View>
      )}
    </Card>
  );
}
