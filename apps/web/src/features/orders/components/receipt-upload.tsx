'use client';

import { orderCopy, orderRefusalStopsPayment } from '@gymsheet/domain';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ImageUp, ShieldAlert } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { queryKeys } from '@/shared/api/query-keys';
import { Button } from '@/shared/components/ui/button';
import { Field } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import { notify } from '@/shared/notifications';
import { buyerOrdersService, imageForm, orderErrorCode, orderErrorText } from '../services/orders-client';

const ACCEPTED = ['image/jpeg', 'image/png'];

/**
 * Step 3 of the checkout: the receipt, private (JPEG/PNG, encrypted by the
 * backend; only the business and, inside a dispute, REPP see it). The answer
 * is the order in «En verificación por el negocio». A business that stopped
 * being public answers 409 ORDER_BUSINESS_UNAVAILABLE (ADR-0028 §10): the
 * step ends in «No pagues» instead of offering another try.
 */
export function ReceiptUpload({ orderId }: Readonly<{ orderId: string }>) {
  const client = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [reference, setReference] = useState('');
  const [invalid, setInvalid] = useState<string | null>(null);

  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const send = useMutation({
    mutationFn: (chosen: File) => buyerOrdersService.uploadReceipt(orderId, imageForm(chosen), reference),
    onSuccess: (order) => {
      client.setQueryData(queryKeys.orders.detail(orderId), order);
      void client.invalidateQueries({ queryKey: queryKeys.orders.list });
      notify.success('Comprobante enviado. El negocio lo revisa.');
    },
    onError: (failure) => {
      // The order itself may have changed (cancelled with the closure): read it again.
      if (orderRefusalStopsPayment(orderErrorCode(failure))) void client.invalidateQueries({ queryKey: queryKeys.orders.detail(orderId) });
    },
  });

  if (orderRefusalStopsPayment(orderErrorCode(send.error))) {
    return (
      <div className="flex items-start gap-3 rounded-[var(--radius-lg)] bg-[var(--danger-bg)] p-4 text-[var(--danger-text)]" role="alert">
        <ShieldAlert aria-hidden className="mt-0.5 size-5 shrink-0" />
        <p className="t-subhead font-semibold">{orderCopy.doNotPay}</p>
      </div>
    );
  }

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!file) return setInvalid('Elige la foto o captura de tu comprobante.');
        send.mutate(file);
      }}
    >
      <div className="grid gap-2">
        <p className="font-semibold">Foto del comprobante</p>
        <label className="choice-card min-h-32 place-items-center gap-2 rounded-[var(--radius-lg)] border-dashed p-4 text-center">
          <input
            accept={ACCEPTED.join(',')}
            aria-label="Foto del comprobante"
            name="file"
            className="sr-only"
            onChange={(event) => {
              const chosen = event.target.files?.[0] ?? null;
              if (chosen && !ACCEPTED.includes(chosen.type)) {
                setInvalid('Usa una imagen JPG o PNG.');
                return;
              }
              setInvalid(null);
              setFile(chosen);
            }}
            type="file"
          />
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element -- local object URL of the file the person just chose.
            <img alt="Vista previa del comprobante" className="max-h-64 rounded-[var(--radius-md)] object-contain" src={preview} />
          ) : (
            <>
              <ImageUp aria-hidden className="size-6 text-[var(--text-muted)]" />
              <span className="t-subhead text-[var(--text-muted)]">Elige una captura o foto (JPG o PNG)</span>
            </>
          )}
        </label>
        {invalid ? <p className="t-footnote text-[var(--danger-text)]" role="alert">{invalid}</p> : null}
      </div>
      <Field hint="Opcional. Ayuda al negocio a encontrar tu pago." label="Número de operación">
        <Input autoComplete="off" maxLength={100} name="reference" onChange={(event) => setReference(event.target.value)} spellCheck={false} value={reference} />
      </Field>
      {send.error ? <p className="t-subhead text-[var(--danger-text)]" role="alert">{orderErrorText(send.error)}</p> : null}
      <Button loading={send.isPending} type="submit" variant="primary">
        {orderCopy.upload}
      </Button>
      <p className="t-footnote text-[var(--text-muted)]">{orderCopy.receiptPrivate}</p>
    </form>
  );
}
