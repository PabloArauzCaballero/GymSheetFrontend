'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/query-keys';
import { businessOrdersService } from '../../services/orders-client';

/** «Por confirmar» for the nav badge: one small page of the inbox, refreshed every minute. */
export function usePendingOrdersCount(): number {
  const badge = useQuery({
    queryKey: queryKeys.business.ordersBadge,
    queryFn: () => businessOrdersService.list({ limit: 1 }),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  return badge.data?.pendingCount ?? 0;
}
