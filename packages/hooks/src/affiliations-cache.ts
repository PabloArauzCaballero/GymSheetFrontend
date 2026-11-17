import { queryKeys } from './query-keys';

/**
 * Pure cache helpers of the affiliation lists (franja 7b, no React; see
 * ADR-008). A decided request leaves the gym's inbox at once; a change of the
 * person's own affiliations refreshes everything the confirmed gym gates.
 */
export type CursorPages<T> = { pages: Array<{ items: T[]; nextCursor: string | null }>; pageParams: unknown[] };

export function itemsOfPages<T>(data: CursorPages<T> | undefined): T[] {
  return data?.pages.flatMap((page) => page.items) ?? [];
}

/** Drops one row (confirmed, rejected or ended) from the loaded pages. */
export function removeFromPages<T extends { id: string }>(data: CursorPages<T> | undefined, rowId: string): CursorPages<T> | undefined {
  if (!data) return data;
  return { ...data, pages: data.pages.map((page) => ({ ...page, items: page.items.filter((item) => item.id !== rowId) })) };
}

/** Replaces one row with the answer of a write. */
export function replaceInPages<T extends { id: string }>(data: CursorPages<T> | undefined, row: T): CursorPages<T> | undefined {
  if (!data) return data;
  return { ...data, pages: data.pages.map((page) => ({ ...page, items: page.items.map((item) => (item.id === row.id ? row : item)) })) };
}

/** What a person's request, cancel or leave can change: «Mi gimnasio», the own list, the ranking and the members. */
export function personAffiliationKeys(): ReadonlyArray<readonly string[]> {
  return [queryKeys.myGym, queryKeys.affiliations.all, queryKeys.leaderboard];
}
