import { queryKeys } from '@gymsheet/hooks';
import { orderCopy } from '@gymsheet/domain';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useState } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/text';
import { Button, Input } from '@/components/ui';
import { pickKycPhoto, takeKycPhoto } from '@/features/business/kyc/pick-photo';
import type { KycLocalFile } from '@/features/business/kyc/kyc-photo';
import { notify } from '@/notifications';
import { colors, radii, spacing } from '@/theme';
import { buyerOrdersService, imageForm, orderErrorText } from './orders-service';

/**
 * Step 3 of the checkout: the receipt from the camera or the gallery (JPEG or
 * PNG), sent as a private multipart file. Never a community attachment and
 * never a local `file://` path in place of a URL (D6): if the upload fails,
 * nothing is sent and the person retries.
 */
export function ReceiptPicker({ orderId }: { orderId: string }) {
  const client = useQueryClient();
  const [file, setFile] = useState<KycLocalFile | null>(null);
  const [reference, setReference] = useState('');
  const send = useMutation({
    mutationFn: async (chosen: KycLocalFile) => buyerOrdersService.uploadReceipt(orderId, await imageForm(chosen), reference),
    onSuccess: (order) => {
      client.setQueryData(queryKeys.orders.detail(orderId), order);
      void client.invalidateQueries({ queryKey: queryKeys.orders.list });
      notify.success('Comprobante enviado. El negocio lo revisa.');
    },
  });

  async function choose(source: 'camera' | 'library') {
    const result = source === 'camera' ? await takeKycPhoto('comprobante', 'back') : await pickKycPhoto('comprobante');
    if ('error' in result) notify.warning(result.error);
    else if ('file' in result) setFile(result.file);
  }

  return (
    <View style={{ gap: spacing.md }}>
      <Text strong variant="headline">Foto del comprobante</Text>
      {file ? (
        <Image accessibilityLabel="Vista previa del comprobante" cachePolicy="none" contentFit="contain" source={{ uri: file.uri }} style={{ width: '100%', height: 240, borderRadius: radii.lg, backgroundColor: colors.surfaceHigh }} />
      ) : null}
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Button icon="camera-outline" label="Tomar foto" onPress={() => void choose('camera')} size="sm" style={{ flex: 1 }} variant="secondary" />
        <Button icon="images-outline" label="Galería" onPress={() => void choose('library')} size="sm" style={{ flex: 1 }} variant="secondary" />
      </View>
      <Input autoCorrect={false} label="Número de operación (opcional)" maxLength={100} onChangeText={setReference} value={reference} />
      {send.error ? <Text accessibilityRole="alert" tone="danger" variant="subhead">{orderErrorText(send.error)}</Text> : null}
      <Button disabled={!file} label={orderCopy.upload} loading={send.isPending} onPress={() => file && send.mutate(file)} />
      <Text tone="secondary" variant="footnote">{orderCopy.receiptPrivate}</Text>
    </View>
  );
}
