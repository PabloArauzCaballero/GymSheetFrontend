import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@gymsheet/hooks';

/** Query keys of the "Conocer" profile: the shared ones, so web and mobile invalidate alike. */
export const socialProfileKeys = {
  profile: queryKeys.socialProfile,
  interests: queryKeys.interestCatalog,
  readiness: queryKeys.discoveryReadiness,
};

/** Anything that can close a readiness gap (photos, preferences, profile switch) calls this. */
export function refreshDiscoveryReadiness(queryClient: Pick<QueryClient, 'invalidateQueries'>) {
  return queryClient.invalidateQueries({ queryKey: socialProfileKeys.readiness });
}
