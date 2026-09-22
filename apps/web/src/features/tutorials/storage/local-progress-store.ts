import type { TutorialProgressRecord } from '@/shared/api/contracts';

/**
 * In-memory, per-user mirror of tutorial progress. It is the offline cache and
 * the fallback source when the backend progress endpoints are unavailable. It
 * is intentionally NOT persisted to Web Storage: the project prohibits browser
 * storage for user state, and the backend remains the source of truth for an
 * authenticated user. As a result this cache lives for the session only —
 * progress recorded while the backend is unreachable syncs on the next
 * successful backend write and survives reloads via the backend, not this map.
 *
 * Keyed per user id so a shared device never leaks progress between accounts.
 */
const store = new Map<string, TutorialProgressRecord[]>();

export function readLocalProgress(userId: string): TutorialProgressRecord[] {
  return store.get(userId)?.map((record) => ({ ...record })) ?? [];
}

export function writeLocalProgress(userId: string, records: TutorialProgressRecord[]): void {
  store.set(
    userId,
    records.map((record) => ({ ...record })),
  );
}

export function upsertLocalProgress(
  userId: string,
  record: TutorialProgressRecord,
): TutorialProgressRecord[] {
  const next = readLocalProgress(userId).filter((item) => item.tutorialId !== record.tutorialId);
  next.push({ ...record });
  writeLocalProgress(userId, next);
  return next;
}

export function removeLocalProgress(userId: string, tutorialId: string): TutorialProgressRecord[] {
  const next = readLocalProgress(userId).filter((item) => item.tutorialId !== tutorialId);
  writeLocalProgress(userId, next);
  return next;
}

/** Test helper: wipe the in-memory cache. */
export function clearLocalProgress(): void {
  store.clear();
}
