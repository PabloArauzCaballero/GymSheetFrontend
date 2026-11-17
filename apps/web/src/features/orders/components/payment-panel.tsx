'use client';

import { formatDateTime, formatMoney, orderCopy } from '@gymsheet/domain';
import { useQuery } from '@tanstack/react-query';
import { ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { queryKeys } from '@/shared/api/query-keys';
import type { BuyerOrderDetail } from '@/shared/api/schemas';
import { SkeletonText } from '@/shared/components/feedback/skeleton';
import { PrivateImage } from '@/shared/components/media/private-image';
import { Button } from '@/shared/components/ui/button';
import { buyerOrdersService, orderErrorCode, orderErrorText } from '../services/orders-client';
import { ReceiptUpload } from './receipt-upload';

function Row({ label, value }: Readonly<{ label: string; value: string | null }>) {
  if (!value) return null;
  return (
    <div className="flex flex-wrap justify-between gap-x-4 gap-y-0.5 py-2">
      <dt className="text-[var(--text-muted)]">{label}</dt>
      <dd className="m-0 font-semibold" translate="no">{value}</dd>
    </div>
  );
}

/**
 * Step 2 of the checkout: the business's QR and bank data, only for this
 * order (D5), then «Ya pagué» opens the receipt. A business that stopped being
 * public answers 409 ORDER_BUSINESS_UNAVAILABLE: the person is told not to pay.
 */
export function PaymentPanel({ order, uploadFirst = false }: Readonly<{ order: BuyerOrderDetail; uploadFirst?: boolean }>) {
  const [paid, setPaid] = useState(uploadFirst);
  const instructions = useQuery({ queryKey: queryKeys.orders.instructions(order.id), queryFn: () => buyerOrdersService.instructions(order.id), retry: false });

  if (instructions.isPending) return <SkeletonText lines={4} />;
  if (instructions.isError) {
    const unavailable = orderErrorCode(instructions.error) === 'ORDER_BUSINESS_UNAVAILABLE';
    return (
      <div className="flex items-start gap-3 rounded-[var(--radius-lg)] bg-[var(--danger-bg)] p-4 text-[var(--danger-text)]" role="alert">
        <ShieldAlert aria-hidden className="mt-0.5 size-5 shrink-0" />
        <p className="t-subhead font-semibold">{unavailable ? orderCopy.doNotPay : orderErrorText(instructions.error)}</p>
      </div>
    );
  }
  const data = instructions.data;
  const cash = data.method === 'CASH';
  return (
    <section aria-labelledby="pay-title" className="grid gap-4">
      <h2 className="t-headline" id="pay-title">{cash ? 'Paga en el negocio' : 'Paga con el QR del negocio'}</h2>
      <p className="t-subhead text-[var(--text-muted)]">
        {cash ? 'Lleva el monto exacto. El negocio confirma cuando le pagas.' : 'Escanéalo desde la app de tu banco y paga el monto exacto.'}
        {data.expiresAt ? ` Tienes hasta el ${formatDateTime(data.expiresAt)}.` : ''}
      </p>
      {data.qrPath ? (
        <div className="grid justify-items-center rounded-[var(--radius-xl)] bg-[var(--surface)] p-4">
          <PrivateImage alt={`QR de pago de ${order.seller.name}`} className="aspect-square w-full max-w-72 bg-white" path={data.qrPath} />
        </div>
      ) : null}
      <dl className="m-0 divide-y divide-[var(--border-subtle)] rounded-[var(--radius-lg)] bg-[var(--surface)] px-4 text-[15px]">
        <Row label="Monto" value={formatMoney(data.amount, data.currency)} />
        <Row label="Banco" value={data.bankName} />
        <Row label="Titular" value={data.accountHolderName} />
        <Row label="Cuenta" value={data.accountNumber} />
        <Row label="Alias o celular" value={data.aliasOrPhone} />
        <Row label="Pedido" value={data.orderNumber} />
      </dl>
      {data.instructions ? <p className="whitespace-pre-line text-[15px] text-[var(--text-muted)]">{data.instructions}</p> : null}
      {cash || !order.actions.canUploadReceipt ? null : paid ? (
        <ReceiptUpload orderId={order.id} />
      ) : (
        <Button onClick={() => setPaid(true)} size="lg" variant="primary">
          {orderCopy.paid}
        </Button>
      )}
    </section>
  );
}
