import type { TutorialProgressRecord } from '@/shared/api/contracts';

/**
 * Per-user mirror of tutorial progress: the offline cache and the fallback
 * source when the backend progress endpoints are unavailable
 * (`tutorial-progress-gateway.ts`). The backend has no `/me/tutorial-progress`
 * yet (docs/refactor-profesional/trabajo/HALLAZGOS.md, H02), so this bridge is
 * what actually keeps "Omitir"/step progress from resetting on every reload
 * today. Backed by `sessionStorage`, not `localStorage` — the project
 * prohibits Web Storage for user state long-term, and this is explicitly a
 * short-lived bridge, cleared with the tab, not a persistence layer. If
 * storage throws (private mode, disabled storage) it falls back to an
 * in-memory map so the tour still works for the rest of the page's life.
 *
 * Keyed per user id so a shared device never leaks progress between accounts.
 */

const memoryFallback = new Map<string, TutorialProgressRecord[]>();

function storageKey(userId: string): string {
  return `gymsheet.tutorial-progress.${userId}`;
}

function readStorage(userId: string): TutorialProgressRecord[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(storageKey(userId));
    return raw ? (JSON.parse(raw) as TutorialProgressRecord[]) : null;
  } catch {
    return null;
  }
}

function writeStorage(userId: string, records: TutorialProgressRecord[]): boolean {
  if (typeof window === 'undefined') return false;
  try {
    window.sessionStorage.setItem(storageKey(userId), JSON.stringify(records));
    return true;
  } catch {
    return false;
  }
}

export function readLocalProgress(userId: string): TutorialProgressRecord[] {
  const stored = readStorage(userId);
  if (stored) return stored.map((record) => ({ ...record }));
  return (memoryFallback.get(userId) ?? []).map((record) => ({ ...record }));
}

export function writeLocalProgress(userId: string, records: TutorialProgressRecord[]): void {
  const copy = records.map((record) => ({ ...record }));
  if (writeStorage(userId, copy)) {
    memoryFallback.delete(userId);
  } else {
    memoryFallback.set(userId, copy);
  }
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

/** Test helper: wipe both the storage-backed and in-memory fallback caches. */
export function clearLocalProgress(): void {
  memoryFallback.clear();
  if (typeof window === 'undefined') return;
  try {
    for (let i = window.sessionStorage.length - 1; i >= 0; i -= 1) {
      const key = window.sessionStorage.key(i);
      if (key?.startsWith('gymsheet.tutorial-progress.')) window.sessionStorage.removeItem(key);
    }
  } catch {
    // Storage inaccessible: nothing to clear there.
  }
}
