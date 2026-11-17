'use client';

import { buyerOrderChip, formatDateTime, formatMoney, orderRejectionLabels, timelineEntryText } from '@gymsheet/domain';
import type { ModerationOrderContent, OrderMethod, OrderRejectionCode, OrderStatus } from '@gymsheet/schemas';
import { ReceiptViewer } from '@/features/orders/components/business/receipt-viewer';

/** Only the audited case route is ever fetched, whatever the content says. */
const RECEIPT_PATH = /^\/admin\/moderation\/cases\/PAYMENT_ORDER\/[0-9a-f-]{36}\/receipt$/u;

const HOLDER: Record<string, string> = { PASS: 'coincide con el KYC', WARN: 'no se parece al KYC', UNKNOWN: 'sin KYC aprobado' };

function Line({ label, value }: Readonly<{ label: string; value: string | null }>) {
  if (!value) return null;
  return (
    <p className="text-sm">
      <span className="text-[var(--text-muted)]">{label}: </span>
      {value}
    </p>
  );
}

/**
 * A disputed order as REPP reads it (case `content`, ADR-0024): amounts,
 * states, timeline and the seller's standing. The receipt opens only here,
 * through the audited case route, fetched with no-store; REPP decides about
 * the business, never about the payment.
 */
export function OrderBody({ order }: Readonly<{ order: ModerationOrderContent }>) {
  const method = order.method as OrderMethod;
  const chip = buyerOrderChip({ status: order.status as OrderStatus, method });
  const seller = order.seller;
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-semibold text-[var(--text-muted)]">
        Pedido {order.orderNumber} · {chip.label} · {method === 'CASH' ? 'Efectivo' : 'QR'}
      </p>
      <p className="text-base font-semibold">
        {order.listingName ?? 'Publicación'}
        {order.quantity > 1 ? ` · ${order.quantity} unidades` : ''}
      </p>
      <p className="text-sm tabular-nums">{formatMoney(order.amount, order.currency)}</p>
      <Line label="Negocio" value={`${seller.name}${seller.handle ? ` (@${seller.handle})` : ''} · ${seller.isVerified ? 'verificado' : 'sin verificar'} · ${seller.status}`} />
      <Line label="Titular de la cuenta" value={seller.holderMatch ? HOLDER[seller.holderMatch] ?? seller.holderMatch : null} />
      <Line label="Nota de la persona" value={order.buyerNote} />
      <Line label="Rechazo" value={order.rejection ? `${orderRejectionLabels[order.rejection.code as OrderRejectionCode] ?? order.rejection.code}${order.rejection.note ? ` «${order.rejection.note}»` : ''}` : null} />
      <Line label="Referencia" value={order.receipt.reference} />
      {order.receipt.uploaded ? <Line label="Comprobantes enviados" value={String(order.receipt.attempts)} /> : null}
      <ul className="m-0 grid list-none gap-1 p-0 text-sm">
        {order.timeline.map((entry) => (
          <li className="flex flex-wrap justify-between gap-x-3" key={`${entry.status}-${entry.at}`}>
            <span>{timelineEntryText({ status: entry.status as OrderStatus, by: 'SYSTEM', reasonCode: entry.reasonCode }, method)}</span>
            <time className="tabular-nums text-[var(--text-muted)]" dateTime={entry.at}>{formatDateTime(entry.at)}</time>
          </li>
        ))}
      </ul>
      {order.receipt.path && RECEIPT_PATH.test(order.receipt.path) ? (
        <ReceiptViewer label={`Comprobante del pedido ${order.orderNumber}`} path={order.receipt.path} />
      ) : (
        <p className="text-sm text-[var(--text-muted)]">Sin comprobante: pago en efectivo o todavía no enviado.</p>
      )}
    </div>
  );
}
