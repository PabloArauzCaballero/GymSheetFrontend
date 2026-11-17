'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/query-keys';
import { personAffiliationsService } from '../../services/affiliations-client';

/** `GET /me/gym`, shared by the profile row, the badge and «Mi gimnasio». */
export function useMyGym() {
  return useQuery({ queryKey: queryKeys.myGym, queryFn: personAffiliationsService.myGym, staleTime: 30_000 });
}
