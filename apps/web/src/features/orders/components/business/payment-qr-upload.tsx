'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ImageUp } from 'lucide-react';
import { useState } from 'react';
import { queryKeys } from '@/shared/api/query-keys';
import type { PaymentConfig } from '@/shared/api/schemas';
import { PrivateImage } from '@/shared/components/media/private-image';
import { notify } from '@/shared/notifications';
import { businessOrdersService, imageForm, orderErrorText } from '../../services/orders-client';

const ACCEPTED = ['image/jpeg', 'image/png'];

/**
 * Step 3: the QR image of the bank, private (encrypted; only a buyer of an
 * open order sees it). A new one replaces the old; `version` busts the view.
 */
export function PaymentQrUpload({ config }: Readonly<{ config: PaymentConfig }>) {
  const client = useQueryClient();
  const [invalid, setInvalid] = useState<string | null>(null);
  const upload = useMutation({
    mutationFn: (file: File) => businessOrdersService.uploadPaymentQr(imageForm(file)),
    onSuccess: (saved) => {
      client.setQueryData(queryKeys.business.paymentConfig, saved);
      notify.success('QR guardado. Ya te pueden pagar con él.');
    },
  });
  const path = config.hasQr ? `${businessOrdersService.paymentQrPath}?v=${encodeURIComponent(config.updatedAt)}` : null;

  return (
    <section aria-labelledby="qr-title" className="grid gap-4">
      <div className="grid gap-1">
        <h2 className="t-headline" id="qr-title">Tu QR de cobro</h2>
        <p className="t-subhead text-[var(--text-muted)]">Descárgalo de la app de tu banco y súbelo aquí. Solo lo ve quien te hace un pedido.</p>
      </div>
      {path ? <PrivateImage alt="Tu QR de cobro" className="aspect-square w-full max-w-60 justify-self-center bg-white" path={path} /> : null}
      <label className="choice-card min-h-24 place-items-center gap-2 rounded-[var(--radius-lg)] border-dashed p-4 text-center">
        <input
          accept={ACCEPTED.join(',')}
          aria-label={config.hasQr ? 'Cambiar el QR' : 'Subir tu QR'}
          className="sr-only"
          disabled={upload.isPending}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (!file) return;
            if (!ACCEPTED.includes(file.type)) return setInvalid('Usa una imagen JPG o PNG.');
            setInvalid(null);
            upload.mutate(file);
          }}
          type="file"
        />
        <ImageUp aria-hidden className="size-6 text-[var(--text-muted)]" />
        <span className="font-semibold">{upload.isPending ? 'Subiendo…' : config.hasQr ? 'Cambiar el QR' : 'Subir tu QR'}</span>
      </label>
      {invalid || upload.error ? (
        <p className="t-subhead text-[var(--danger-text)]" role="alert">{invalid ?? orderErrorText(upload.error)}</p>
      ) : null}
    </section>
  );
}
