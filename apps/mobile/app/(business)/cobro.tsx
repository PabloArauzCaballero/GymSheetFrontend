import { holderMatchText, paymentConfigErrors, paymentConfigFormOf, paymentConfigPayload, paymentReadiness, type PaymentConfigForm } from '@gymsheet/domain';
import { queryKeys } from '@gymsheet/hooks';
import type { PaymentConfig } from '@gymsheet/schemas';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';
import { Checkbox } from '@/components/checkbox';
import { ErrorState, RowsSkeleton } from '@/components/feedback';
import { Card, ScreenHeader, ScrollScreen } from '@/components/layout';
import { Text } from '@/components/text';
import { Button, Input } from '@/components/ui';
import { pickKycPhoto } from '@/features/business/kyc/pick-photo';
import { businessOrdersService, imageForm, orderErrorText } from '@/features/orders/orders-service';
import { PrivateImage } from '@/features/orders/private-image';
import { notify } from '@/notifications';
import { spacing } from '@/theme';

/** Bank data in two steps of at most four fields: the account, then how the business charges. */
function ConfigForm({ config, onDone }: { config: PaymentConfig | null; onDone: () => void }) {
  const client = useQueryClient();
  const [form, setForm] = useState<PaymentConfigForm>(() => paymentConfigFormOf(config));
  const [step, setStep] = useState<1 | 2>(1);
  const [tried, setTried] = useState(false);
  const errors = tried ? paymentConfigErrors(form, step) : {};
  const set = <K extends keyof PaymentConfigForm>(key: K, value: PaymentConfigForm[K]) => setForm((current) => ({ ...current, [key]: value }));
  const save = useMutation({
    mutationFn: () => businessOrdersService.savePaymentConfig(paymentConfigPayload(form)),
    onSuccess: (saved) => {
      client.setQueryData(queryKeys.business.paymentConfig, saved);
      notify.success('Datos de cobro guardados.');
      onDone();
    },
  });
  function next() {
    setTried(true);
    if (Object.keys(paymentConfigErrors(form, step)).length > 0) return;
    setTried(false);
    if (step === 1) setStep(2);
    else save.mutate();
  }
  return (
    <View style={{ gap: spacing.md }}>
      <Text tone="secondary" variant="footnote">Paso {step} de 2</Text>
      <Text accessibilityRole="header" variant="headline">{step === 1 ? 'Tu cuenta' : 'Cómo cobras'}</Text>
      {step === 1 ? (
        <>
          <Input error={errors.bankName} label="Banco" maxLength={100} onChangeText={(value) => set('bankName', value)} value={form.bankName} />
          <Input error={errors.accountHolderName} label="Titular de la cuenta" maxLength={180} onChangeText={(value) => set('accountHolderName', value)} value={form.accountHolderName} />
          <Input error={errors.accountNumber} keyboardType="numbers-and-punctuation" label="Número de cuenta (opcional)" maxLength={100} onChangeText={(value) => set('accountNumber', value)} value={form.accountNumber} />
          <Input error={errors.aliasOrPhone} label="Alias o celular (opcional)" maxLength={100} onChangeText={(value) => set('aliasOrPhone', value)} value={form.aliasOrPhone} />
        </>
      ) : (
        <>
          <Input error={errors.instructions} label="Instrucciones para pagar (opcional)" maxLength={2000} multiline onChangeText={(value) => set('instructions', value)} value={form.instructions} />
          <Checkbox checked={form.acceptsCash} label="También acepto efectivo en mi negocio" onChange={(value) => set('acceptsCash', value)} />
          <Checkbox checked={form.isActive} label="Recibir pedidos ahora" onChange={(value) => set('isActive', value)} />
        </>
      )}
      {save.error ? <Text accessibilityRole="alert" tone="danger" variant="subhead">{orderErrorText(save.error)}</Text> : null}
      <Button label={step === 1 ? 'Continuar' : 'Guardar'} loading={save.isPending} onPress={next} />
      <Button label={step === 2 ? 'Atrás' : 'Cancelar'} onPress={() => (step === 2 ? setStep(1) : onDone())} variant="ghost" />
    </View>
  );
}

/** «Cobro» of the business (plan §4.2): where it stands to be paid, its bank data and its private QR. */
export default function BusinessPaymentsScreen() {
  const client = useQueryClient();
  const [editing, setEditing] = useState(false);
  const config = useQuery({ queryKey: queryKeys.business.paymentConfig, queryFn: () => businessOrdersService.paymentConfig() });
  const upload = useMutation({
    mutationFn: async () => {
      const picked = await pickKycPhoto('qr');
      if ('error' in picked) throw new Error(picked.error);
      if (!('file' in picked)) return null;
      return businessOrdersService.uploadPaymentQr(await imageForm(picked.file));
    },
    onSuccess: (saved) => {
      if (!saved) return;
      client.setQueryData(queryKeys.business.paymentConfig, saved);
      notify.success('QR guardado. Ya te pueden pagar con él.');
    },
    onError: (error) => notify.error(orderErrorText(error)),
  });

  if (config.isPending) return <ScrollScreen><RowsSkeleton rows={4} /></ScrollScreen>;
  if (config.isError) return <ScrollScreen><ErrorState error={config.error} onRetry={() => void config.refetch()} /></ScrollScreen>;
  const data = config.data;
  const readiness = paymentReadiness(data);
  const holder = holderMatchText(data?.holderMatch ?? null);
  return (
    <ScrollScreen onRefresh={() => void config.refetch()} refreshing={config.isRefetching}>
      <ScreenHeader subtitle="Te pagan directo a tu cuenta. Tú confirmas cada pago." title="Cobro" />
      <Text strong tone={readiness.ready ? 'default' : 'secondary'} variant="subhead">{readiness.text}</Text>
      <Card>
        {editing || !data ? (
          <ConfigForm config={data} onDone={() => setEditing(false)} />
        ) : (
          <View style={{ gap: spacing.sm }}>
            <Text strong variant="body">{data.bankName}</Text>
            <Text tone="secondary" variant="subhead">{data.accountHolderName}{data.accountNumber ? ` · ${data.accountNumber}` : ''}</Text>
            <Text tone="secondary" variant="subhead">{data.acceptsCash ? 'También aceptas efectivo.' : 'Solo QR.'}</Text>
            {holder ? <Text tone="warning" variant="subhead">{holder}</Text> : null}
            <Button label="Editar datos" onPress={() => setEditing(true)} size="sm" variant="ghost" />
          </View>
        )}
      </Card>
      {data ? (
        <Card>
          <Text accessibilityRole="header" variant="headline">Tu QR de cobro</Text>
          <Text tone="secondary" variant="subhead">Descárgalo de la app de tu banco y súbelo aquí. Solo lo ve quien te hace un pedido.</Text>
          {data.hasQr ? (
            <View style={{ alignItems: 'center' }}>
              <PrivateImage label="Tu QR de cobro" path={`${businessOrdersService.paymentQrPath}?v=${encodeURIComponent(data.updatedAt)}`} size={220} />
            </View>
          ) : null}
          <Button icon="qr-code-outline" label={data.hasQr ? 'Cambiar el QR' : 'Subir tu QR'} loading={upload.isPending} onPress={() => upload.mutate()} variant={data.hasQr ? 'ghost' : 'primary'} />
        </Card>
      ) : null}
    </ScrollScreen>
  );
}
