'use client';

import { subscriberFilterOptions, subscriptionCopy } from '@gymsheet/domain';
import { itemsOfPages } from '@gymsheet/hooks';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { queryKeys } from '@/shared/api/query-keys';
import type { SubscriberFilter } from '@/shared/api/schemas';
import { EmptyState } from '@/shared/components/feedback/empty-state';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { SkeletonList } from '@/shared/components/feedback/skeleton';
import { PageHeader } from '@/shared/components/layout/page-header';
import { Button } from '@/shared/components/ui/button';
import { ChoiceChip } from '@/shared/components/ui/choice-chip';
import { businessSubscriptionsService } from '../../services/subscriptions-client';
import { SubscriberRow } from './subscriber-row';

/**
 * «Suscriptores» of any business (plan §2.10): the latest plan of each person
 * and listing it sold, soonest end first, filtered «Por vencer» or «Vencidos».
 * Replaces the gym's «quién no renovó».
 */
export function SubscribersPanel() {
  const [status, setStatus] = useState<SubscriberFilter | ''>('');
  const pages = useInfiniteQuery({
    queryKey: queryKeys.business.subscribersList(status),
    queryFn: ({ pageParam }) => businessSubscriptionsService.list({ status: status || null, cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor,
  });
  const rows = itemsOfPages(pages.data);
  const today = pages.data?.pages[0]?.today ?? '';
  return (
    <div className="grid gap-6">
      <PageHeader description={subscriptionCopy.subscribersBody} title={subscriptionCopy.subscribers} />
      <div aria-label="Filtrar por estado" className="flex flex-wrap gap-2" role="group">
        {subscriberFilterOptions.map((option) => (
          <ChoiceChip key={option.label} onClick={() => setStatus(option.value)} selected={status === option.value}>
            {option.label}
          </ChoiceChip>
        ))}
      </div>
      {pages.isPending ? (
        <SkeletonList rows={3} />
      ) : pages.isError ? (
        <ErrorPanel error={pages.error} message="No pudimos cargar tus suscriptores." onRetry={() => void pages.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState description={subscriptionCopy.emptySubscribers} level={3} title={status ? 'Nadie con este estado' : 'Todavía no hay suscriptores'} />
      ) : (
        <div className="grid gap-3">
          <ul aria-label={subscriptionCopy.subscribers} className="m-0 grid list-none gap-3 p-0">
            {rows.map((row) => (
              <SubscriberRow key={row.id} row={row} today={today} />
            ))}
          </ul>
          {pages.hasNextPage ? (
            <Button className="justify-self-center" loading={pages.isFetchingNextPage} onClick={() => void pages.fetchNextPage()} variant="ghost">
              Ver más
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}
