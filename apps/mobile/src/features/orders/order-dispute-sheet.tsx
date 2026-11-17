import { ApiError } from '@gymsheet/api-client';
import { orderCopy, orderDisputeReasonLabels, orderDisputeReasons, type OrderDisputeReason } from '@gymsheet/domain';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';
import { BottomSheet } from '@/components/bottom-sheet';
import { Text } from '@/components/text';
import { Button, Input } from '@/components/ui';
import { ChoiceChip } from '@/components/wizard/choice-chip';
import { notify } from '@/notifications';
import { spacing } from '@/theme';
import { buyerOrdersService } from './orders-service';

/** «Tengo un problema con este pedido»: a PAYMENT_ORDER report for REPP, which can suspend the business but refunds nothing. */
export function OrderDisputeSheet({ orderId, visible, onClose }: { orderId: string; visible: boolean; onClose: () => void }) {
  const [reason, setReason] = useState<OrderDisputeReason | null>(null);
  const [details, setDetails] = useState('');
  function close() {
    setReason(null);
    setDetails('');
    onClose();
  }
  const send = useMutation({
    mutationFn: () => {
      if (!reason) throw new Error('Elige un motivo.');
      return buyerOrdersService.report(orderId, reason, details);
    },
    onSuccess: () => {
      notify.success(orderCopy.disputeSent);
      close();
    },
    onError: (error: Error) => {
      if (error instanceof ApiError && error.kind === 'conflict') {
        notify.info('Ya lo reportaste. REPP lo está revisando.');
        close();
        return;
      }
      notify.error(error);
    },
  });
  return (
    <BottomSheet
      footer={<Button disabled={!reason} label="Enviar reporte" loading={send.isPending} onPress={() => send.mutate()} />}
      onClose={close}
      title={orderCopy.dispute}
      visible={visible}
    >
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {orderDisputeReasons.map((option) => (
          <ChoiceChip key={option} label={orderDisputeReasonLabels[option]} onSelect={() => setReason(option)} selected={reason === option} />
        ))}
      </View>
      <Input label="Cuéntanos más (opcional)" maxLength={1000} multiline onChangeText={setDetails} value={details} />
      <Text tone="secondary" variant="footnote">{orderCopy.disputeConsequence}</Text>
    </BottomSheet>
  );
}
