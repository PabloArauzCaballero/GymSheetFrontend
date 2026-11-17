import { ApiError } from '@gymsheet/api-client';
import { buyerNextStep, buyerOrderChip, formatMoney, orderCopy, orderItemLine } from '@gymsheet/domain';
import { queryKeys } from '@gymsheet/hooks';
import type { BuyerOrderDetail } from '@gymsheet/schemas';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { EmptyState, ErrorState, RowsSkeleton } from '@/components/feedback';
import { Badge, Card, ScreenHeader, ScrollScreen } from '@/components/layout';
import { Text } from '@/components/text';
import { Button } from '@/components/ui';
import { OrderDisputeSheet } from '@/features/orders/order-dispute-sheet';
import { OrderSteps } from '@/features/orders/order-steps';
import { buyerOrdersService, orderErrorText } from '@/features/orders/orders-service';
import { PaymentSection } from '@/features/orders/payment-section';
import { confirm, notify } from '@/notifications';
import { spacing } from '@/theme';

function NextStep({ order }: { order: BuyerOrderDetail }) {
  const [resending, setResending] = useState(false);
  const next = buyerNextStep(order);
  if (next === 'pay' || next === 'cash') return <PaymentSection order={order} />;
  if (next === 'resend') {
    return (
      <View style={{ gap: spacing.md }}>
        <Text strong tone="danger" variant="body">{order.rejection?.text ?? 'El negocio observó tu pago.'}</Text>
        {order.rejection?.note ? <Text tone="secondary" variant="subhead">«{order.rejection.note}»</Text> : null}
        {resending ? <PaymentSection order={order} uploadFirst /> : <Button label={orderCopy.resend} onPress={() => setResending(true)} />}
      </View>
    );
  }
  if (next === 'wait') return <Text variant="body">El negocio está revisando tu comprobante. Te avisamos cuando lo confirme.</Text>;
  if (next === 'done') return <Text strong variant="body">Listo: el negocio confirmó tu pago.</Text>;
  if (order.cancelReason === 'BUSINESS_UNAVAILABLE') return <Text strong tone="danger" variant="body">{orderCopy.doNotPay}</Text>;
  return <Text tone="secondary" variant="body">{order.status === 'EXPIRED' ? 'Venció sin pago. Si todavía lo quieres, haz un pedido nuevo.' : order.status === 'REJECTED' ? 'Ya no puedes enviar otro comprobante.' : 'Este pedido se canceló.'}</Text>;
}

/** One order of «Mis compras» (plan §4.3): the track, how to pay, the receipt and the actions. Someone else's is a 404. */
export default function OrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const client = useQueryClient();
  const [disputing, setDisputing] = useState(false);
  const order = useQuery({ queryKey: queryKeys.orders.detail(id), queryFn: () => buyerOrdersService.get(id) });
  const cancel = useMutation({
    mutationFn: () => buyerOrdersService.cancel(id),
    onSuccess: (updated) => {
      client.setQueryData(queryKeys.orders.detail(id), updated);
      void client.invalidateQueries({ queryKey: queryKeys.orders.list });
      notify.success('Pedido cancelado.');
    },
    onError: (error) => notify.error(orderErrorText(error)),
  });

  if (order.isPending) return <ScrollScreen><RowsSkeleton rows={4} /></ScrollScreen>;
  if (order.isError) {
    const missing = order.error instanceof ApiError && order.error.status === 404;
    return (
      <ScrollScreen>
        {missing ? <EmptyState icon="bag-outline" message="Puede que el enlace esté mal o que no sea tuyo." title="No encontramos este pedido" /> : <ErrorState error={order.error} onRetry={() => void order.refetch()} />}
      </ScrollScreen>
    );
  }
  const data = order.data;
  const chip = buyerOrderChip(data);

  async function askCancel() {
    const answer = await confirm({ title: orderCopy.cancel, message: data.method === 'CASH' ? 'El negocio deja de esperarte.' : 'Si ya pagaste, no canceles: envía el comprobante.', severity: 'danger', confirmLabel: orderCopy.cancel, cancelLabel: 'Volver' });
    if (answer.confirmed) cancel.mutate();
  }

  return (
    <ScrollScreen onRefresh={() => void order.refetch()} refreshing={order.isRefetching}>
      <ScreenHeader subtitle={`${data.seller.name} · ${data.orderNumber}`} title={orderItemLine(data)} />
      <View style={{ gap: spacing.xs }}>
        <Badge label={chip.label} tone={chip.tone} />
        <Text tabular variant="title">{formatMoney(data.amount, data.currency)}</Text>
      </View>
      <Card>
        <OrderSteps order={data} />
      </Card>
      <Card>
        <NextStep order={data} />
      </Card>
      {data.actions.canCancel ? <Button label={orderCopy.cancel} loading={cancel.isPending} onPress={() => void askCancel()} variant="ghost" /> : null}
      {data.actions.canReport ? <Button icon="help-buoy-outline" label={orderCopy.dispute} onPress={() => setDisputing(true)} variant="ghost" /> : null}
      <OrderDisputeSheet onClose={() => setDisputing(false)} orderId={data.id} visible={disputing} />
    </ScrollScreen>
  );
}
