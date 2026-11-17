'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/query-keys';
import { personSubscriptionsService } from '../../services/subscriptions-client';

/** `GET /me/subscriptions`, shared by the list, the profile row, Inicio and «Mi gimnasio». */
export function useMySubscriptions(enabled = true) {
  return useQuery({ queryKey: queryKeys.subscriptions.list, queryFn: personSubscriptionsService.list, staleTime: 30_000, enabled });
}
