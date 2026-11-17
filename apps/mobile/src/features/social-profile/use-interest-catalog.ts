import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { socialProfileService } from '@/api/social-profile-service';
import { socialProfileKeys } from './query-keys';

/** The interest catalog changes rarely: one fetch serves the flow, the cards and the profiles. */
export function useInterestCatalog() {
  return useQuery({
    queryKey: socialProfileKeys.interests,
    queryFn: socialProfileService.interests,
    staleTime: 60 * 60_000,
  });
}

/** Code → label. A code the catalog no longer knows is dropped rather than shown raw. */
export function useInterestLabels(codes: readonly string[] | undefined): string[] {
  const catalog = useInterestCatalog();
  return useMemo(() => {
    const byCode = new Map((catalog.data ?? []).map((entry) => [entry.code, entry.label]));
    return (codes ?? []).flatMap((code) => {
      const label = byCode.get(code);
      return label ? [label] : [];
    });
  }, [catalog.data, codes]);
}
