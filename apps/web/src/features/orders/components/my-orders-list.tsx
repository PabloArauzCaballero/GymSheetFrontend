'use client';

import { formatDateTime, formatMoney, orderCopy, orderItemLine } from '@gymsheet/domain';
import { ordersOfPages } from '@gymsheet/hooks';
import { useInfiniteQuery } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { queryKeys } from '@/shared/api/query-keys';
import { EmptyState } from '@/shared/components/feedback/empty-state';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { SkeletonList } from '@/shared/components/feedback/skeleton';
import { PageHeader } from '@/shared/components/layout/page-header';
import { Button, ButtonLink } from '@/shared/components/ui/button';
import { buyerOrdersService } from '../services/orders-client';
import { OrderChip } from './order-chip';

/** «Mis compras» (plan §4.3): every order of the person, newest first, by cursor. */
export function MyOrdersList() {
  const orders = useInfiniteQuery({
    queryKey: queryKeys.orders.list,
    queryFn: ({ pageParam }) => buyerOrdersService.list({ cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor,
  });
  const items = ordersOfPages(orders.data);

  return (
    <div className="grid gap-6">
      <PageHeader description="Lo que compraste en el marketplace y en qué va cada pedido." title={orderCopy.myOrders} />
      {orders.isPending ? (
        <SkeletonList />
      ) : orders.isError ? (
        <ErrorPanel error={orders.error} message={orders.error.message} onRetry={() => void orders.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState action={<ButtonLink href="/marketplace">Ir al marketplace</ButtonLink>} description={orderCopy.emptyMine} flat title="Todavía no compraste nada" />
      ) : (
        <ul aria-label="Tus pedidos" className="m-0 grid list-none gap-1 rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--surface-low)] p-2">
          {items.map((order) => (
            <li key={order.id}>
              <Link
                className="grid min-h-20 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-4 rounded-[var(--radius-lg)] px-3 py-3 transition-colors duration-[var(--dur-1)] hover:bg-[var(--surface)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--volt)]"
                href={`/profile/compras/${order.id}`}
              >
                <span className="grid min-w-0 gap-1">
                  <span className="truncate font-semibold">{orderItemLine(order)}</span>
                  <span className="t-footnote truncate text-[var(--text-muted)]">
                    {order.seller.name} · {formatDateTime(order.createdAt)}
                  </span>
                  <OrderChip order={order} side="buyer" />
                </span>
                <span className="font-semibold tabular-nums">{formatMoney(order.amount, order.currency)}</span>
                <ChevronRight aria-hidden className="size-5 text-[var(--text-muted)]" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      {orders.hasNextPage ? (
        <Button className="justify-self-center" loading={orders.isFetchingNextPage} onClick={() => void orders.fetchNextPage()} variant="ghost">
          Ver más
        </Button>
      ) : null}
    </div>
  );
}
