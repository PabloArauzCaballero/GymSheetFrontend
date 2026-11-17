'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/query-keys';
import { gymAffiliationsService } from '../../services/affiliations-client';

/** Pending requests for the nav badge: one small page of the inbox, refreshed every minute (GYM only). */
export function usePendingAffiliationsCount(enabled: boolean): number {
  const badge = useQuery({
    queryKey: queryKeys.business.affiliationsBadge,
    queryFn: () => gymAffiliationsService.requests({ limit: 1 }),
    enabled,
    refetchInterval: 60_000,
    staleTime: 30_000,
    // 409 GYM_NOT_ACTIVE while the gym is not public: no badge, the panel explains it.
    retry: false,
  });
  return badge.data?.pendingCount ?? 0;
}
