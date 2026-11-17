'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchCurrentLegal } from '@/features/auth/services/auth-client';

export const currentLegalQueryKey = ['legal', 'current'] as const;

/** Current legal versions. The backend caches them for 5 minutes; so does this. */
export function useCurrentLegal() {
  return useQuery({
    queryKey: currentLegalQueryKey,
    queryFn: fetchCurrentLegal,
    staleTime: 5 * 60_000,
  });
}
