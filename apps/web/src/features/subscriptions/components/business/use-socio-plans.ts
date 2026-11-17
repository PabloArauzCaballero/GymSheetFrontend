'use client';

import { socioPlanChip } from '@gymsheet/domain';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/query-keys';
import { businessSubscriptionsService } from '../../services/subscriptions-client';

export type PlanChip = { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral' | 'info' };

/**
 * The plan of each SOCIO on «Socios» (plan §4.2): activo hasta / vencido /
 * sin plan, read from the first page of «Suscriptores». A SOCIO beyond that
 * page shows no chip rather than a wrong «Sin plan».
 */
export function useSocioPlans(enabled: boolean): (affiliationId: string) => PlanChip | null {
  const page = useQuery({
    queryKey: queryKeys.business.subscribersList('socios'),
    queryFn: () => businessSubscriptionsService.list({ limit: 50 }),
    enabled,
    staleTime: 30_000,
  });
  const data = page.data;
  return (affiliationId) => (data ? socioPlanChip(affiliationId, data.items, data.nextCursor === null, data.today) : null);
}
