/**
 * Where each client remembers that a member already saw their profile at 100 %
 * (localStorage on the web, SecureStore on the phone). Per member, because two
 * accounts can share a device; versioned, so a format change can be ignored.
 * SecureStore keys allow only `[A-Za-z0-9._-]`: the id is a UUID.
 */
export function profileCompleteSeenKey(userId: string): string {
  return `gymsheet.profile.complete-seen.v1.${userId}`;
}

/**
 * The 100 % card is a reward, so it is said once. The first time the profile
 * is seen complete the full card shows (`full`); afterwards a quiet one-line
 * entry keeps the way to the preview (`quiet`). Below 100 % there is no
 * complete card at all (`none`): the nudge with the missing items takes its place.
 * `seenBefore` is what the device remembered when the screen opened (undefined
 * while it is still being read: render nothing rather than flash the wrong one).
 */
export function completeCardMode(percent: number, seenBefore: boolean | undefined): 'full' | 'quiet' | 'none' | 'pending' {
  if (percent < 100) return 'none';
  if (seenBefore === undefined) return 'pending';
  return seenBefore ? 'quiet' : 'full';
}

/**
 * What the device should remember after this read: seen at 100 %, forgotten
 * below it — so completing the profile again (after removing a photo, say)
 * celebrates again instead of staying quiet forever.
 */
export function completeSeenAfter(percent: number): boolean {
  return percent >= 100;
}

/** Shared bio placeholder: an instruction, so it never reads as someone's real bio. */
export const BIO_PLACEHOLDER = 'Ej.: qué entrenas, cuándo vas y a quién buscas.';
