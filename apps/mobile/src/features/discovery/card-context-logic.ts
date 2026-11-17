import type { Ionicons } from '@expo/vector-icons';
import {
  discoveryReasonChips,
  formatDistanceKm,
  isVerifiedCard,
  type DiscoveryReasonChipCode,
} from '@gymsheet/domain';

type IconName = keyof typeof Ionicons.glyphMap;

export const REASON_ICON: Record<DiscoveryReasonChipCode, IconName> = {
  SAME_GYM: 'business-outline',
  SAME_ROUTINE: 'repeat-outline',
  SAME_GOAL: 'flag-outline',
  SHARED_INTERESTS: 'sparkles-outline',
  NEARBY: 'location-outline',
  NEW_HERE: 'leaf-outline',
};

export type CardContext = {
  verified: boolean;
  distance: string | null;
  chips: { code: DiscoveryReasonChipCode; label: string; icon: IconName }[];
};

/** What the deck card says about a person besides their profile: why, how far, verified. Never when. */
export function cardContextOf(card: { reasons: readonly string[]; distanceKm: number | null }): CardContext {
  const verified = isVerifiedCard(card);
  const distance = formatDistanceKm(card.distanceKm);
  const chips = discoveryReasonChips(card).map((chip) => ({ ...chip, icon: REASON_ICON[chip.code] }));
  return { verified, distance, chips };
}
