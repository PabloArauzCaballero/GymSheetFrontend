'use client';

import { buyerNextStep, cancelledByBusinessNotice, formatMoney, orderCopy, orderItemLine } from '@gymsheet/domain';
import { ApiError } from '@gymsheet/api-client';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, TriangleAlert } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { queryKeys } from '@/shared/api/query-keys';
import type { BuyerOrderDetail } from '@/shared/api/schemas';
import { EmptyState } from '@/shared/components/feedback/empty-state';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { SkeletonDetail } from '@/shared/components/feedback/skeleton';
import { Button } from '@/shared/components/ui/button';
import { buyerOrdersService } from '../services/orders-client';
import { OrderActions } from './order-actions';
import { OrderChip } from './order-chip';
import { OrderSteps } from './order-steps';
import { PaymentPanel } from './payment-panel';

const card = 'grid gap-5 rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--surface-low)] p-5 sm:p-6';

function Notice({ tone, children }: Readonly<{ tone: 'success' | 'danger' | 'neutral'; children: React.ReactNode }>) {
  const palette = tone === 'success' ? 'bg-[var(--success-bg)] text-[var(--success-text)]' : tone === 'danger' ? 'bg-[var(--danger-bg)] text-[var(--danger-text)]' : 'bg-[var(--surface)]';
  const Icon = tone === 'success' ? CheckCircle2 : TriangleAlert;
  return (
    <div className={`flex items-start gap-3 rounded-[var(--radius-lg)] p-4 ${palette}`} role={tone === 'danger' ? 'alert' : 'status'}>
      <Icon aria-hidden className="mt-0.5 size-5 shrink-0" />
      <div className="t-subhead grid gap-1">{children}</div>
    </div>
  );
}

/** What happens next, by state: pay, send the receipt again, wait, pay cash, or nothing more. */
function NextStep({ order }: Readonly<{ order: BuyerOrderDetail }>) {
  const [resending, setResending] = useState(false);
  const next = buyerNextStep(order);
  if (next === 'pay' || next === 'cash') return <PaymentPanel order={order} />;
  if (next === 'resend') {
    return (
      <div className="grid gap-4">
        <Notice tone="danger">
          <p className="font-semibold">{order.rejection?.text ?? 'El negocio observó tu pago.'}</p>
          {order.rejection?.note ? <p>«{order.rejection.note}»</p> : null}
        </Notice>
        {resending ? (
          <PaymentPanel order={order} uploadFirst />
        ) : (
          <Button onClick={() => setResending(true)} size="lg" variant="primary">
            {orderCopy.resend}
          </Button>
        )}
      </div>
    );
  }
  if (next === 'wait') {
    return (
      <Notice tone="neutral">
        <p className="font-semibold">El negocio está revisando tu comprobante.</p>
        <p className="text-[var(--text-muted)]">Te avisamos cuando lo confirme.{order.receipt.reference ? ` Operación ${order.receipt.reference}.` : ''}</p>
      </Notice>
    );
  }
  if (next === 'done') return <Notice tone="success"><p className="font-semibold">Listo: el negocio confirmó tu pago.</p></Notice>;
  const byBusiness = cancelledByBusinessNotice(order.cancelReason);
  if (byBusiness) return <Notice tone="danger"><p className="font-semibold">{byBusiness}</p></Notice>;
  return (
    <Notice tone="neutral">
      <p>{order.status === 'EXPIRED' ? 'Venció sin pago. Si todavía lo quieres, haz un pedido nuevo.' : order.status === 'REJECTED' ? 'El negocio observó el pago y ya no puedes enviar otro comprobante.' : 'Este pedido se canceló.'}</p>
      {order.listing.id ? (
        <Link className="font-semibold underline underline-offset-4" href={`/publicacion/${order.listing.id}`}>Ver la publicación</Link>
      ) : null}
    </Notice>
  );
}

/** One order of «Mis compras» (plan §4.3): the track, how to pay, the receipt and the actions. Someone else's is a 404. */
export function OrderDetail({ orderId }: Readonly<{ orderId: string }>) {
  const order = useQuery({ queryKey: queryKeys.orders.detail(orderId), queryFn: () => buyerOrdersService.get(orderId) });
  if (order.isPending) return <SkeletonDetail />;
  if (order.isError) {
    if (order.error instanceof ApiError && order.error.status === 404) {
      return <EmptyState description="Puede que el enlace esté mal o que no sea tuyo." flat title="No encontramos este pedido" />;
    }
    return <ErrorPanel error={order.error} message={order.error.message} onRetry={() => void order.refetch()} />;
  }
  const data = order.data;
  return (
    <div className="mx-auto grid w-full max-w-2xl gap-6">
      <Link className="t-subhead inline-flex min-h-11 items-center font-semibold text-[var(--text-muted)] hover:text-[var(--text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--volt)]" href="/profile/compras">
        ← {orderCopy.myOrders}
      </Link>
      <header className="grid gap-2">
        <OrderChip order={data} side="buyer" />
        <h1 className="display-title text-balance break-words">{orderItemLine(data)}</h1>
        <p className="title-text tabular-nums">{formatMoney(data.amount, data.currency)}</p>
        <p className="t-subhead text-[var(--text-muted)]">
          {data.seller.handle ? <Link className="underline-offset-4 hover:underline" href={`/@${data.seller.handle}`}>{data.seller.name}</Link> : data.seller.name}
          {' · '}
          <span translate="no">{data.orderNumber}</span>
        </p>
      </header>
      <div className={card}>
        <OrderSteps order={data} />
      </div>
      <div className={card}>
        <NextStep order={data} />
      </div>
      <OrderActions order={data} />
    </div>
  );
}
