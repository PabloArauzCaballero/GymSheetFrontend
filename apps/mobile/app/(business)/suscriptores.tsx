import { subscriberFilterOptions, subscriptionCopy } from '@gymsheet/domain';
import { itemsOfPages, queryKeys } from '@gymsheet/hooks';
import type { SubscriberFilter } from '@gymsheet/schemas';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ScrollView } from 'react-native';
import { EmptyState, ErrorState, RowsSkeleton } from '@/components/feedback';
import { FilterChip } from '@/components/filter-chip';
import { ScreenHeader, ScrollScreen } from '@/components/layout';
import { Button } from '@/components/ui';
import { SubscriberRow } from '@/features/subscriptions/subscriber-row';
import { businessSubscriptionsService } from '@/features/subscriptions/subscriptions-service';
import { spacing } from '@/theme';

/** «Suscriptores» of any business (franja 8e): who holds a plan and when it ends, «Por vencer» and «Vencidos». */
export default function BusinessSubscribersScreen() {
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
    <ScrollScreen onRefresh={() => void pages.refetch()} refreshing={pages.isRefetching}>
      <ScreenHeader detail subtitle={subscriptionCopy.subscribersBody} title={subscriptionCopy.subscribers} />
      <ScrollView contentContainerStyle={{ gap: spacing.sm }} horizontal showsHorizontalScrollIndicator={false}>
        {subscriberFilterOptions.map((option) => <FilterChip key={option.label} label={option.label} onPress={() => setStatus(option.value)} selected={status === option.value} />)}
      </ScrollView>
      {pages.isPending ? (
        <RowsSkeleton rows={3} />
      ) : pages.isError ? (
        <ErrorState error={pages.error} onRetry={() => void pages.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState icon="people-outline" message={subscriptionCopy.emptySubscribers} title={status ? 'Nadie con este estado' : 'Todavía no hay suscriptores'} />
      ) : (
        rows.map((row) => <SubscriberRow key={row.id} row={row} today={today} />)
      )}
      {pages.hasNextPage ? <Button label="Ver más" loading={pages.isFetchingNextPage} onPress={() => void pages.fetchNextPage()} variant="ghost" /> : null}
    </ScrollScreen>
  );
}
