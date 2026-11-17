import { formatDateTime, formatMoney, orderCopy } from '@gymsheet/domain';
import { queryKeys } from '@gymsheet/hooks';
import type { BuyerOrderDetail } from '@gymsheet/schemas';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';
import { RowsSkeleton } from '@/components/feedback';
import { Text } from '@/components/text';
import { Button } from '@/components/ui';
import { radii, spacing, tones } from '@/theme';
import { buyerOrdersService, orderErrorCode, orderErrorText } from './orders-service';
import { PrivateImage } from './private-image';
import { ReceiptPicker } from './receipt-picker';

function Fact({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }}>
      <Text tone="secondary" variant="subhead">{label}</Text>
      <Text selectable strong style={{ flexShrink: 1, textAlign: 'right' }} variant="subhead">{value}</Text>
    </View>
  );
}

/**
 * Step 2: the business's QR and bank data, only for this order (D5), then
 * «Ya pagué» opens the receipt. A business no longer public answers 409
 * ORDER_BUSINESS_UNAVAILABLE and the person is told not to pay.
 */
export function PaymentSection({ order, uploadFirst = false }: { order: BuyerOrderDetail; uploadFirst?: boolean }) {
  const [paid, setPaid] = useState(uploadFirst);
  const instructions = useQuery({ queryKey: queryKeys.orders.instructions(order.id), queryFn: () => buyerOrdersService.instructions(order.id), retry: false });
  if (instructions.isPending) return <RowsSkeleton rows={3} thumb={40} />;
  if (instructions.isError) {
    const unavailable = orderErrorCode(instructions.error) === 'ORDER_BUSINESS_UNAVAILABLE';
    return (
      <View accessibilityRole="alert" style={{ padding: spacing.md, borderRadius: radii.md, backgroundColor: tones.dark.danger.bg }}>
        <Text strong style={{ color: tones.dark.danger.text }} variant="subhead">{unavailable ? orderCopy.doNotPay : orderErrorText(instructions.error)}</Text>
      </View>
    );
  }
  const data = instructions.data;
  const cash = data.method === 'CASH';
  return (
    <View style={{ gap: spacing.md }}>
      <Text accessibilityRole="header" variant="headline">{cash ? 'Paga en el negocio' : 'Paga con el QR del negocio'}</Text>
      <Text tone="secondary" variant="subhead">
        {cash ? 'Lleva el monto exacto. El negocio confirma cuando le pagas.' : 'Escanéalo desde la app de tu banco y paga el monto exacto.'}
        {data.expiresAt ? ` Tienes hasta el ${formatDateTime(data.expiresAt)}.` : ''}
      </Text>
      {data.qrPath ? (
        <View style={{ alignItems: 'center' }}>
          <PrivateImage label={`QR de pago de ${order.seller.name}`} path={data.qrPath} size={240} />
        </View>
      ) : null}
      <View style={{ gap: spacing.sm }}>
        <Fact label="Monto" value={formatMoney(data.amount, data.currency)} />
        <Fact label="Banco" value={data.bankName} />
        <Fact label="Titular" value={data.accountHolderName} />
        <Fact label="Cuenta" value={data.accountNumber} />
        <Fact label="Alias o celular" value={data.aliasOrPhone} />
        <Fact label="Pedido" value={data.orderNumber} />
      </View>
      {data.instructions ? <Text tone="secondary" variant="subhead">{data.instructions}</Text> : null}
      {cash || !order.actions.canUploadReceipt ? null : paid ? <ReceiptPicker orderId={order.id} /> : <Button label={orderCopy.paid} onPress={() => setPaid(true)} />}
    </View>
  );
}
