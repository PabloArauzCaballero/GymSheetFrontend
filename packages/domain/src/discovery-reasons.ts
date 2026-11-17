import type { DiscoveryCard, DiscoveryReasonCode } from '@gymsheet/schemas';

/** A card answers "why this person?" in a glance: three reasons at most. */
export const MAX_DISCOVERY_REASON_CHIPS = 3;

/** VERIFIED is a badge next to the name, not a chip. */
export type DiscoveryReasonChipCode = Exclude<DiscoveryReasonCode, 'VERIFIED'>;

export const discoveryReasonLabels: Record<DiscoveryReasonChipCode, string> = {
  SAME_GYM: 'Tu mismo gimnasio',
  SAME_ROUTINE: 'Misma rutina',
  SAME_GOAL: 'Mismo objetivo',
  SHARED_INTERESTS: 'Intereses en común',
  NEARBY: 'Cerca de ti',
  NEW_HERE: 'Acaba de unirse',
};

/** Chip order: the gym you both belong to, what you share in training, then place and novelty. */
const CHIP_ORDER: readonly DiscoveryReasonChipCode[] = [
  'SAME_GYM',
  'SAME_ROUTINE',
  'SAME_GOAL',
  'SHARED_INTERESTS',
  'NEARBY',
  'NEW_HERE',
];

export type DiscoveryReasonChip = { code: DiscoveryReasonChipCode; label: string };

/**
 * The reason chips of a card, in a stable order and capped.
 *
 * Takes raw strings on purpose: only codes in the closed list can become a
 * chip, so a presence code (TRAINING_NOW, ACTIVE_NOW) from an older server is
 * never shown even if it slips past parsing. NEARBY is dropped when the
 * distance is shown: "a 2 km" already says it.
 */
export function discoveryReasonChips(
  card: { reasons: readonly string[]; distanceKm: number | null },
  limit = MAX_DISCOVERY_REASON_CHIPS,
): DiscoveryReasonChip[] {
  const present = new Set(card.reasons);
  const distanceShown = formatDistanceKm(card.distanceKm) !== null;
  return CHIP_ORDER.filter((code) => present.has(code) && !(code === 'NEARBY' && distanceShown))
    .slice(0, Math.max(0, limit))
    .map((code) => ({ code, label: discoveryReasonLabels[code] }));
}

/**
 * "a 2 km", "a menos de 1 km", or `null` when there is no distance to say.
 * Whole kilometres only: the backend already rounds and never sends a location.
 */
export function formatDistanceKm(km: number | null | undefined): string | null {
  if (km === null || km === undefined || !Number.isFinite(km) || km < 0) return null;
  return km < 1 ? 'a menos de 1 km' : `a ${Math.round(km)} km`;
}

export const verifiedBadgeCopy = {
  label: 'Verificada',
  /** Contains the visible label, so voice control finds it by what it shows. */
  accessibleName: 'Persona verificada',
} as const;

export function isVerifiedCard(card: { reasons: readonly string[] }): boolean {
  return card.reasons.includes('VERIFIED');
}

/** Deck cards carry ranking context; directory entries and profiles do not. */
export function isDiscoveryCard<T extends object>(entry: T): entry is T & Pick<DiscoveryCard, 'reasons' | 'distanceKm'> {
  return 'reasons' in entry && Array.isArray((entry as { reasons?: unknown }).reasons) && 'distanceKm' in entry;
}
