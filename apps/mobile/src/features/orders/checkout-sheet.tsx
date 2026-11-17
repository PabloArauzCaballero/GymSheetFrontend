import { ApiError } from '@gymsheet/api-client';
import { queryKeys } from '@gymsheet/hooks';
import { formatMoney, maxOrderQuantity, multiplyMoney, orderCopy } from '@gymsheet/domain';
import type { OrderMethod, PublicListing } from '@gymsheet/schemas';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { BottomSheet } from '@/components/bottom-sheet';
import { Text } from '@/components/text';
import { Button, Input } from '@/components/ui';
import { ChoiceCard } from '@/features/business/type-cards';
import { spacing } from '@/theme';
import { buyerOrdersService, orderErrorCode, orderErrorText } from './orders-service';

/**
 * Step 1 of the checkout (plan §4.3): what you buy, how many (products only)
 * and how you pay. The body carries no amount: the price is the listing's on
 * the server. On success the order screen takes over (QR, receipt, timeline).
 */
export function CheckoutSheet({ listing, visible, onClose }: { listing: PublicListing; visible: boolean; onClose: () => void }) {
  const router = useRouter();
  const client = useQueryClient();
  const max = maxOrderQuantity(listing.offerKind);
  const [quantity, setQuantity] = useState(1);
  const [method, setMethod] = useState<OrderMethod>('QR');
  const [note, setNote] = useState('');
  const create = useMutation({
    mutationFn: () => buyerOrdersService.create({ listingId: listing.id, method, ...(max > 1 ? { quantity } : {}), ...(note.trim() ? { note: note.trim() } : {}) }),
    onSuccess: (order) => {
      client.setQueryData(queryKeys.orders.detail(order.id), order);
      void client.invalidateQueries({ queryKey: queryKeys.orders.list });
      onClose();
      router.push({ pathname: '/compras/[id]', params: { id: order.id } });
    },
  });
  const openOrderId = orderErrorCode(create.error) === 'ORDER_ALREADY_OPEN' && create.error instanceof ApiError ? String(create.error.details?.orderId ?? '') : '';

  return (
    <BottomSheet
      footer={<Button label={orderCopy.confirm} loading={create.isPending} onPress={() => create.mutate()} />}
      onClose={onClose}
      subtitle={listing.seller.name}
      title={orderCopy.confirmTitle}
      visible={visible}
    >
      <View style={{ gap: spacing.xs }}>
        <Text strong variant="body">{listing.name}</Text>
        <Text tabular variant="title">{formatMoney(multiplyMoney(listing.price, quantity), listing.currency)}</Text>
        {quantity > 1 ? <Text tabular tone="secondary" variant="footnote">{formatMoney(listing.price, listing.currency)} por unidad</Text> : null}
      </View>
      {max > 1 ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text strong variant="body">Cantidad</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Button accessibilityLabel="Una menos" disabled={quantity <= 1} haptic="selection" label="−" onPress={() => setQuantity((value) => value - 1)} size="sm" variant="ghost" />
            <Text accessibilityLiveRegion="polite" strong tabular variant="headline">{quantity}</Text>
            <Button accessibilityLabel="Una más" disabled={quantity >= max} haptic="selection" label="+" onPress={() => setQuantity((value) => value + 1)} size="sm" variant="ghost" />
          </View>
        </View>
      ) : null}
      <View accessibilityRole="radiogroup" style={{ gap: spacing.smd }}>
        <ChoiceCard description={orderCopy.payQrHint} icon="qr-code-outline" onPress={() => setMethod('QR')} selected={method === 'QR'} title={orderCopy.payQr} />
        <ChoiceCard description={orderCopy.payCashHint} icon="cash-outline" onPress={() => setMethod('CASH')} selected={method === 'CASH'} title={orderCopy.payCash} />
      </View>
      <Input label="Nota para el negocio (opcional)" maxLength={500} multiline onChangeText={setNote} placeholder="Una talla, un horario para retirar" value={note} />
      {create.error ? (
        <View accessibilityRole="alert" style={{ gap: spacing.xs }}>
          <Text tone="danger" variant="subhead">{orderErrorText(create.error)}</Text>
          {openOrderId ? (
            <Button
              label="Abrir tu pedido"
              onPress={() => {
                onClose();
                router.push({ pathname: '/compras/[id]', params: { id: openOrderId } });
              }}
              size="sm"
              variant="ghost"
            />
          ) : null}
        </View>
      ) : null}
      <Text tone="secondary" variant="footnote">Pagas directo al negocio y él confirma. REPP no cobra ni devuelve pagos.</Text>
    </BottomSheet>
  );
}
