'use client';

import { formatDateTime, formatMoney, orderDeadline, orderItemLine } from '@gymsheet/domain';
import { ApiError } from '@gymsheet/api-client';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { queryKeys } from '@/shared/api/query-keys';
import { EmptyState } from '@/shared/components/feedback/empty-state';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { SkeletonDetail } from '@/shared/components/feedback/skeleton';
import { Badge } from '@/shared/components/ui/badge';
import { businessOrdersService } from '../../services/orders-client';
import { OrderChip } from '../order-chip';
import { OrderSteps } from '../order-steps';
import { OrderDecision } from './order-decision';
import { ReceiptViewer } from './receipt-viewer';

const card = 'grid gap-5 rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--surface-low)] p-5 sm:p-6';

function Fact({ label, value }: Readonly<{ label: string; value: string | null }>) {
  if (!value) return null;
  return (
    <div className="grid gap-0.5">
      <dt className="t-footnote text-[var(--text-muted)]">{label}</dt>
      <dd className="m-0 font-semibold">{value}</dd>
    </div>
  );
}

/**
 * One order of the business (plan §4.2): the amount to expect, the reference,
 * the receipt with zoom, and Confirmar / Rechazar. Another business's order is
 * a 404 from the backend.
 */
export function BusinessOrderDetail({ orderId }: Readonly<{ orderId: string }>) {
  const order = useQuery({ queryKey: queryKeys.business.order(orderId), queryFn: () => businessOrdersService.get(orderId) });
  if (order.isPending) return <SkeletonDetail />;
  if (order.isError) {
    if (order.error instanceof ApiError && order.error.status === 404) return <EmptyState description="No es de tu negocio o el enlace está mal." flat title="No encontramos este pedido" />;
    return <ErrorPanel error={order.error} message={order.error.message} onRetry={() => void order.refetch()} />;
  }
  const data = order.data;
  const deadline = orderDeadline(data);
  return (
    <div className="grid gap-6">
      <Link className="t-subhead inline-flex min-h-11 items-center justify-self-start font-semibold text-[var(--text-muted)] hover:text-[var(--text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--volt)]" href="/negocio/pedidos">
        ← Pedidos
      </Link>
      <header className="grid gap-2">
        <span className="flex flex-wrap gap-1.5">
          <OrderChip order={data} side="business" />
          {deadline ? <Badge tone={deadline.tone}>{deadline.label}</Badge> : null}
        </span>
        <h1 className="display-title text-balance break-words">{data.buyer.name}</h1>
        <p className="t-subhead text-[var(--text-muted)]">{orderItemLine(data)}</p>
      </header>
      <div className={card}>
        <div className="grid gap-1">
          <p className="data-label">Monto esperado</p>
          <p className="display-title tabular-nums">{formatMoney(data.amount, data.currency)}</p>
          {data.quantity > 1 ? <p className="t-footnote tabular-nums text-[var(--text-muted)]">{data.quantity} × {formatMoney(data.unitAmount, data.currency)}</p> : null}
        </div>
        <dl className="m-0 grid gap-3 sm:grid-cols-2">
          <Fact label="Cómo paga" value={data.method === 'CASH' ? 'En efectivo, en tu negocio' : 'Con tu QR'} />
          <Fact label="Número de operación" value={data.receipt.reference} />
          <Fact label="Pedido" value={data.orderNumber} />
          <Fact label="Enviado" value={data.submittedAt ? formatDateTime(data.submittedAt) : null} />
          <Fact label="Nota de la persona" value={data.note} />
          <Fact label="Motivo del rechazo" value={data.rejection ? data.rejection.text : null} />
        </dl>
      </div>
      <section aria-labelledby="receipt-title" className={card}>
        <h2 className="t-headline" id="receipt-title">Comprobante</h2>
        {data.receipt.uploaded ? (
          <ReceiptViewer label={`Comprobante de ${data.buyer.name}`} path={businessOrdersService.receiptPath(data.id)} />
        ) : (
          <p className="t-subhead text-[var(--text-muted)]">
            {data.method === 'CASH' ? 'Pago en efectivo: confirma cuando te pague en el negocio.' : 'La persona todavía no envió su comprobante.'}
          </p>
        )}
        <OrderDecision order={data} />
      </section>
      <div className={card}>
        <OrderSteps order={data} />
      </div>
    </div>
  );
}
