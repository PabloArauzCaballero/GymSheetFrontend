import { ApiError } from '@gymsheet/api-client';
import { queryKeys } from '@gymsheet/hooks';
import { formatMoney, isGymMembership, joinGymErrors, maxOrderQuantity, multiplyMoney, needsSocioStep, orderCopy, subscriptionCopy, type JoinGymForm } from '@gymsheet/domain';
import type { OrderMethod, PublicListing } from '@gymsheet/schemas';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { BottomSheet } from '@/components/bottom-sheet';
import { Text } from '@/components/text';
import { Button, Input } from '@/components/ui';
import { ChoiceCard } from '@/features/business/type-cards';
import { spacing } from '@/theme';
import { personAffiliationsService } from '@/features/affiliations/affiliations-service';
import { subscriptionErrorText } from '@/features/subscriptions/subscriptions-service';
import { orderErrorCode } from './orders-service';
import { SocioFields } from './socio-fields';
import { useCheckout, useGymLocations } from './use-checkout';

/**
 * The checkout (plan §4.3): what you buy, how many (products only) and how
 * you pay; for a gym membership without SOCIO there, step 2 «Hazte socio»
 * (sede + 3 CI digits). The body carries no amount: the price is the
 * listing's on the server. On success the order screen takes over.
 */
export function CheckoutSheet({ listing, visible, onClose }: { listing: PublicListing; visible: boolean; onClose: () => void }) {
  const router = useRouter();
  const max = maxOrderQuantity(listing.offerKind);
  const [quantity, setQuantity] = useState(1);
  const [method, setMethod] = useState<OrderMethod>('QR');
  const [note, setNote] = useState('');
  const [step, setStep] = useState<'confirm' | 'socio'>('confirm');
  const [socio, setSocio] = useState<JoinGymForm>({ kind: 'SOCIO', locationId: '', ciLast3: '' });
  const [tried, setTried] = useState(false);
  const myGym = useQuery({ queryKey: queryKeys.myGym, queryFn: personAffiliationsService.myGym, enabled: visible && isGymMembership(listing), staleTime: 30_000 });
  const locations = useGymLocations(listing.seller.handle, step === 'socio');
  // A gym with a single sede preselects it: one decision less.
  const socioForm = { ...socio, locationId: socio.locationId || (locations?.length === 1 ? (locations[0]?.id ?? '') : '') };
  const { create, error } = useCheckout({ gymName: listing.seller.name, onNeedsSocio: () => setStep('socio'), onDone: onClose });
  const askSocio = step === 'confirm' && needsSocioStep(listing, myGym.data);
  const shownError = step === 'socio' && orderErrorCode(error) === 'AFFILIATION_REQUIRED' ? null : error;
  const openOrderId = orderErrorCode(error) === 'ORDER_ALREADY_OPEN' && error instanceof ApiError ? String(error.details?.orderId ?? '') : '';

  function submit() {
    if (askSocio) return setStep('socio');
    const draft = { listingId: listing.id, method, ...(max > 1 ? { quantity } : {}), ...(note.trim() ? { note: note.trim() } : {}) };
    if (step === 'confirm') return create.mutate({ draft, socio: null, switchGym: false });
    setTried(true);
    if (locations && Object.keys(joinGymErrors(socioForm, locations)).length === 0) create.mutate({ draft, socio: socioForm, switchGym: false });
  }

  return (
    <BottomSheet
      footer={
        <View style={{ gap: spacing.sm }}>
          <Button label={askSocio ? 'Continuar' : orderCopy.confirm} loading={create.isPending} onPress={submit} testID="checkout-confirm" />
          {step === 'socio' ? <Button label={subscriptionCopy.socioBack} onPress={() => setStep('confirm')} variant="ghost" /> : null}
        </View>
      }
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
      {step === 'socio' ? <SocioFields form={socioForm} locations={locations} onChange={(patch) => setSocio((current) => ({ ...current, ...patch }))} tried={tried} /> : null}
      {step === 'confirm' && max > 1 ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text strong variant="body">Cantidad</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Button accessibilityLabel="Una menos" disabled={quantity <= 1} haptic="selection" label="−" onPress={() => setQuantity((value) => value - 1)} size="sm" variant="ghost" />
            <Text accessibilityLiveRegion="polite" strong tabular variant="headline">{quantity}</Text>
            <Button accessibilityLabel="Una más" disabled={quantity >= max} haptic="selection" label="+" onPress={() => setQuantity((value) => value + 1)} size="sm" variant="ghost" />
          </View>
        </View>
      ) : null}
      {step === 'confirm' ? (
        <>
          <View accessibilityRole="radiogroup" style={{ gap: spacing.smd }}>
            <ChoiceCard description={orderCopy.payQrHint} icon="qr-code-outline" onPress={() => setMethod('QR')} selected={method === 'QR'} title={orderCopy.payQr} />
            <ChoiceCard description={orderCopy.payCashHint} icon="cash-outline" onPress={() => setMethod('CASH')} selected={method === 'CASH'} title={orderCopy.payCash} />
          </View>
          <Input label="Nota para el negocio (opcional)" maxLength={500} multiline onChangeText={setNote} placeholder="Una talla, un horario para retirar" value={note} />
        </>
      ) : null}
      {shownError ? (
        <View accessibilityRole="alert" style={{ gap: spacing.xs }}>
          <Text tone="danger" variant="subhead">{subscriptionErrorText(shownError)}</Text>
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
