import { useQuery } from '@tanstack/react-query';
import { knownReadinessGaps } from '@gymsheet/domain';
import type { DiscoveryReadinessCode } from '@gymsheet/schemas';
import { socialProfileService } from '@/api/social-profile-service';
import { socialProfileKeys } from './query-keys';

/**
 * What still keeps this member out of other people's decks, in the order the
 * backend checks it (the first gap is the next step). Codes this client does
 * not know are skipped. Advisory: while it loads or if it fails, no gap is shown
 * and the deck keeps its own states.
 */
export function useDiscoveryReadiness(): DiscoveryReadinessCode[] {
  const readiness = useQuery({
    queryKey: socialProfileKeys.readiness,
    queryFn: socialProfileService.readiness,
    staleTime: 30_000,
  });
  if (!readiness.data || readiness.data.ready) return [];
  return knownReadinessGaps(readiness.data.missing);
}
