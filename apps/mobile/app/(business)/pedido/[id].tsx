import { ApiError } from '@gymsheet/api-client';
import { businessOrderChip, formatDateTime, formatMoney, orderDeadline, orderItemLine } from '@gymsheet/domain';
import { queryKeys } from '@gymsheet/hooks';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useWindowDimensions, View } from 'react-native';
import { EmptyState, ErrorState, RowsSkeleton } from '@/components/feedback';
import { Badge, Card, ScreenHeader, ScrollScreen } from '@/components/layout';
import { Text } from '@/components/text';
import { OrderDecision } from '@/features/orders/order-decision';
import { OrderSteps } from '@/features/orders/order-steps';
import { businessOrdersService } from '@/features/orders/orders-service';
import { PrivateImage } from '@/features/orders/private-image';
import { spacing } from '@/theme';

function Fact({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <View style={{ gap: spacing.xxs }}>
      <Text tone="secondary" variant="footnote">{label}</Text>
      <Text selectable strong variant="body">{value}</Text>
    </View>
  );
}

/** One order of the business (plan §4.2): amount to expect, reference, the receipt with zoom, Confirmar / Rechazar. */
export default function BusinessOrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const order = useQuery({ queryKey: queryKeys.business.order(id), queryFn: () => businessOrdersService.get(id) });
  if (order.isPending) return <ScrollScreen><RowsSkeleton rows={4} /></ScrollScreen>;
  if (order.isError) {
    const missing = order.error instanceof ApiError && order.error.status === 404;
    return <ScrollScreen>{missing ? <EmptyState icon="receipt-outline" message="No es de tu negocio o el enlace está mal." title="No encontramos este pedido" /> : <ErrorState error={order.error} onRetry={() => void order.refetch()} />}</ScrollScreen>;
  }
  const data = order.data;
  const chip = businessOrderChip(data);
  const deadline = orderDeadline(data);
  return (
    <ScrollScreen onRefresh={() => void order.refetch()} refreshing={order.isRefetching}>
      <ScreenHeader subtitle={orderItemLine(data)} title={data.buyer.name} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
        <Badge label={chip.label} tone={chip.tone} />
        {deadline ? <Badge label={deadline.label} tone={deadline.tone} /> : null}
      </View>
      <Card>
        <Text tone="secondary" variant="footnote">Monto esperado</Text>
        <Text tabular variant="title">{formatMoney(data.amount, data.currency)}</Text>
        {data.quantity > 1 ? <Text tabular tone="secondary" variant="footnote">{data.quantity} × {formatMoney(data.unitAmount, data.currency)}</Text> : null}
        <Fact label="Cómo paga" value={data.method === 'CASH' ? 'En efectivo, en tu negocio' : 'Con tu QR'} />
        <Fact label="Número de operación" value={data.receipt.reference} />
        <Fact label="Pedido" value={data.orderNumber} />
        <Fact label="Enviado" value={data.submittedAt ? formatDateTime(data.submittedAt) : null} />
        <Fact label="Nota de la persona" value={data.note} />
        <Fact label="Motivo del rechazo" value={data.rejection?.text ?? null} />
      </Card>
      <Card>
        <Text accessibilityRole="header" variant="headline">Comprobante</Text>
        {data.receipt.uploaded ? (
          <PrivateImage label={`Comprobante de ${data.buyer.name}`} path={businessOrdersService.receiptPath(data.id)} size={Math.min(width - spacing.lg * 4, 480)} zoomable />
        ) : (
          <Text tone="secondary" variant="subhead">{data.method === 'CASH' ? 'Pago en efectivo: confirma cuando te pague en el negocio.' : 'La persona todavía no envió su comprobante.'}</Text>
        )}
        <OrderDecision order={data} />
      </Card>
      <Card>
        <OrderSteps order={data} />
      </Card>
    </ScrollScreen>
  );
}
