'use client';

import { formatMoney, orderCopy, orderDeadline, orderItemLine } from '@gymsheet/domain';
import { ordersOfPages, splitInbox } from '@gymsheet/hooks';
import { useInfiniteQuery } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { queryKeys } from '@/shared/api/query-keys';
import type { BusinessOrder } from '@/shared/api/schemas';
import { EmptyState } from '@/shared/components/feedback/empty-state';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { SkeletonList } from '@/shared/components/feedback/skeleton';
import { PageHeader } from '@/shared/components/layout/page-header';
import { Badge } from '@/shared/components/ui/badge';
import { Button, ButtonLink } from '@/shared/components/ui/button';
import { businessOrdersService } from '../../services/orders-client';
import { OrderChip } from '../order-chip';

function InboxRow({ order }: Readonly<{ order: BusinessOrder }>) {
  const deadline = orderDeadline(order);
  return (
    <li>
      <Link
        className="grid min-h-20 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-4 rounded-[var(--radius-lg)] px-3 py-3 transition-colors duration-[var(--dur-1)] hover:bg-[var(--surface)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--volt)]"
        href={`/negocio/pedidos/${order.id}`}
      >
        <span className="grid min-w-0 gap-1">
          <span className="truncate font-semibold">{order.buyer.name}</span>
          <span className="t-footnote truncate text-[var(--text-muted)]">
            {orderItemLine(order)} · {order.method === 'CASH' ? 'Efectivo' : 'QR'}
          </span>
          <span className="flex flex-wrap gap-1.5">
            <OrderChip order={order} side="business" />
            {deadline ? <Badge tone={deadline.tone}>{deadline.label}</Badge> : null}
          </span>
        </span>
        <span className="font-semibold tabular-nums">{formatMoney(order.amount, order.currency)}</span>
        <ChevronRight aria-hidden className="size-5 text-[var(--text-muted)]" />
      </Link>
    </li>
  );
}

function Section({ title, orders }: Readonly<{ title: string; orders: BusinessOrder[] }>) {
  if (orders.length === 0) return null;
  return (
    <section className="grid gap-2">
      <h2 className="t-headline">{title}</h2>
      <ul className="m-0 grid list-none gap-1 rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--surface-low)] p-2">
        {orders.map((order) => (
          <InboxRow key={order.id} order={order} />
        ))}
      </ul>
    </section>
  );
}

/**
 * `/negocio/pedidos` (plan §4.2): «Por confirmar» first, oldest first, each
 * with its deadline; then the history. The backend sorts; this only splits.
 */
export function OrdersInbox() {
  const orders = useInfiniteQuery({
    queryKey: queryKeys.business.ordersList,
    queryFn: ({ pageParam }) => businessOrdersService.list({ cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor,
  });
  const { pending, history } = splitInbox(ordersOfPages(orders.data));
  const pendingCount = orders.data?.pages[0]?.pendingCount ?? pending.length;

  return (
    <div className="grid gap-6">
      <PageHeader
        actions={<ButtonLink href="/negocio/cobro" variant="ghost">Cobro</ButtonLink>}
        description="Confirma cada pago cuando el dinero esté en tu cuenta."
        title={orderCopy.inbox}
      />
      {orders.isPending ? (
        <SkeletonList />
      ) : orders.isError ? (
        <ErrorPanel error={orders.error} message={orders.error.message} onRetry={() => void orders.refetch()} />
      ) : pending.length + history.length === 0 ? (
        <EmptyState description={orderCopy.emptyInbox} flat title="Todavía no hay pedidos" />
      ) : (
        <>
          <Section orders={pending} title={`${orderCopy.pendingSection} (${pendingCount})`} />
          <Section orders={history} title={orderCopy.historySection} />
        </>
      )}
      {orders.hasNextPage ? (
        <Button className="justify-self-center" loading={orders.isFetchingNextPage} onClick={() => void orders.fetchNextPage()} variant="ghost">
          Ver más
        </Button>
      ) : null}
    </div>
  );
}
