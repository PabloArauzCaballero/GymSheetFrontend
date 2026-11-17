import { ApiError } from '@gymsheet/api-client';
import { orderCopy, orderRejectionLabels, rejectionNoteError, subscriptionCopy } from '@gymsheet/domain';
import { queryKeys } from '@gymsheet/hooks';
import { orderRejectionCodes, type BusinessOrderDetail, type OrderRejectionCode } from '@gymsheet/schemas';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';
import { Checkbox } from '@/components/checkbox';
import { Text } from '@/components/text';
import { Button, Input } from '@/components/ui';
import { ChoiceChip } from '@/components/wizard/choice-chip';
import { businessService } from '@/features/business/business-service';
import { subscriptionErrorText } from '@/features/subscriptions/subscriptions-service';
import { confirm, notify } from '@/notifications';
import { spacing } from '@/theme';
import { businessOrdersService, orderErrorText } from './orders-service';

/**
 * Confirmar or Rechazar (plan §4.2): confirming asks once; rejecting takes a
 * reason chip and, with «Otro motivo», a note. A gym's MEMBERSHIP carries
 * «También confirmo que es socio», checked (8e); a gym REPP paused (409
 * GYM_NOT_ACTIVE) confirms the payment alone.
 */
export function OrderDecision({ order }: { order: BusinessOrderDetail }) {
  const client = useQueryClient();
  const [rejecting, setRejecting] = useState(false);
  const [code, setCode] = useState<OrderRejectionCode | null>(null);
  const [note, setNote] = useState('');
  const [tried, setTried] = useState(false);
  const settle = (updated: BusinessOrderDetail, message: string) => {
    client.setQueryData(queryKeys.business.order(order.id), updated);
    void client.invalidateQueries({ queryKey: queryKeys.business.orders, predicate: (query) => query.queryKey[3] !== 'detail' });
    notify.success(message);
  };
  const me = useQuery({ queryKey: queryKeys.business.me, queryFn: businessService.me });
  const gymMembership = order.listing.offerKind === 'MEMBERSHIP' && me.data?.entity.entityType === 'GYM';
  const [alsoSocio, setAlsoSocio] = useState(true);
  const approve = useMutation({
    mutationFn: (socio: boolean | null) => businessOrdersService.confirm(order.id, socio === null ? {} : { alsoConfirmAffiliation: socio }),
    onSuccess: (updated, socio) => {
      void client.invalidateQueries({ queryKey: queryKeys.business.subscribers });
      if (socio) void client.invalidateQueries({ queryKey: queryKeys.business.affiliations });
      settle(updated, socio ? 'Pago y socio confirmados. Le avisamos a la persona.' : 'Pago confirmado. Le avisamos a la persona.');
    },
    onError: (error) => {
      if (!(error instanceof ApiError && error.code === 'GYM_NOT_ACTIVE')) notify.error(subscriptionErrorText(error));
    },
  });
  const gymNotActive = approve.error instanceof ApiError && approve.error.code === 'GYM_NOT_ACTIVE';
  const socio = gymMembership ? alsoSocio && !gymNotActive : null;
  const reject = useMutation({
    mutationFn: (reasonCode: OrderRejectionCode) => businessOrdersService.reject(order.id, { reasonCode, ...(note.trim() ? { note: note.trim() } : {}) }),
    onSuccess: (updated) => settle(updated, 'Pago rechazado. La persona ve el motivo.'),
  });
  const noteError = rejectionNoteError(code, note);
  if (!order.actions.canDecide) return null;

  async function askConfirm() {
    const answer = await confirm({ title: orderCopy.confirmQuestion, message: orderCopy.confirmBody, confirmLabel: orderCopy.confirmPayment, cancelLabel: 'Todavía no' });
    if (answer.confirmed) approve.mutate(socio);
  }

  if (!rejecting) {
    return (
      <View style={{ gap: spacing.sm }}>
        {gymMembership && !gymNotActive ? <Checkbox accessibilityHint={subscriptionCopy.alsoConfirmHint} checked={alsoSocio} label={subscriptionCopy.alsoConfirm} onChange={setAlsoSocio} /> : null}
        {gymNotActive ? <Text accessibilityRole="alert" tone="warning" variant="subhead">{subscriptionCopy.gymNotActive}</Text> : null}
        <Button label={gymNotActive ? subscriptionCopy.confirmPaymentOnly : orderCopy.confirmPayment} loading={approve.isPending} onPress={() => void askConfirm()} />
        <Button label={orderCopy.rejectPayment} onPress={() => setRejecting(true)} variant="ghost" />
      </View>
    );
  }
  return (
    <View style={{ gap: spacing.md }}>
      <Text accessibilityRole="header" variant="headline">¿Por qué lo rechazas?</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {orderRejectionCodes.map((value) => (
          <ChoiceChip key={value} label={orderRejectionLabels[value]} onSelect={() => setCode(value)} selected={code === value} />
        ))}
      </View>
      <Input error={tried && noteError ? noteError : undefined} label={code === 'OTHER' ? 'Nota para la persona' : 'Nota para la persona (opcional)'} maxLength={500} multiline onChangeText={setNote} value={note} />
      {reject.error ? <Text accessibilityRole="alert" tone="danger" variant="subhead">{orderErrorText(reject.error)}</Text> : null}
      <Button
        label="Rechazar pago"
        loading={reject.isPending}
        onPress={() => {
          setTried(true);
          if (code && !noteError) reject.mutate(code);
        }}
        variant="danger"
      />
      <Button label="Volver" onPress={() => setRejecting(false)} variant="ghost" />
    </View>
  );
}
