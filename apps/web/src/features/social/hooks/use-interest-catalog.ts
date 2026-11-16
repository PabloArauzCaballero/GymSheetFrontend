'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { socialProfileKeys, socialProfileService } from '../services/social-profile-service';

/**
 * The interest catalog and a code → label lookup. The catalog barely changes,
 * so it is cached for an hour; a code missing from it (retired, or added by a
 * newer backend) has no label and callers hide it instead of printing a code.
 */
export function useInterestCatalog() {
  const query = useQuery({
    queryKey: socialProfileKeys.interestCatalog,
    queryFn: socialProfileService.interestCatalog,
    staleTime: 60 * 60_000,
  });
  const labels = useMemo(
    () => new Map((query.data ?? []).map((entry) => [entry.code, entry.label])),
    [query.data],
  );
  return { query, labels };
}
