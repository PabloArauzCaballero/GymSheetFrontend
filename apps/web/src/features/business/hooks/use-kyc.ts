'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import type { KycState } from '@/shared/api/schemas';
import { queryKeys } from '@/shared/api/query-keys';
import { businessService } from '../services/business-client';
import { businessKycService } from '../services/business-kyc-client';

/** `GET /business/me/kyc`, seeded by the server page so the step paints at once. */
export function useKycState(initial?: KycState | null) {
  return useQuery({
    queryKey: queryKeys.business.kyc,
    queryFn: businessKycService.state,
    ...(initial ? { initialData: initial } : {}),
    staleTime: 15_000,
  });
}

/** `GET /business/me`: name, handle, city and the public logo the KYC steps show. */
export function useBusinessMe() {
  return useQuery({ queryKey: queryKeys.business.me, queryFn: businessService.me, staleTime: 30_000 });
}

/**
 * Applies a write's answer to the cached KYC state at once (pure updaters
 * from `@gymsheet/hooks`), then re-reads it in the background so `missing[]`
 * stays the server's.
 */
export function useKycCache() {
  const client = useQueryClient();
  return useCallback(
    (update: (state: KycState | undefined) => KycState | undefined) => {
      client.setQueryData<KycState>(queryKeys.business.kyc, update);
      void client.invalidateQueries({ queryKey: queryKeys.business.kyc });
    },
    [client],
  );
}
