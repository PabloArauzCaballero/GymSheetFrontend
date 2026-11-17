import type { BusinessOrder, BuyerOrder } from '@gymsheet/schemas';

/**
 * Pure cache helpers of the orders lists (franja 8d, no React; see ADR-008):
 * the detail answer of a write replaces its row at once, and the business
 * inbox is split into «Por confirmar» and the history as the backend sorts it.
 */
export type OrderPages<T> = { pages: Array<{ items: T[]; nextCursor: string | null }>; pageParams: unknown[] };

export function ordersOfPages<T>(data: OrderPages<T> | undefined): T[] {
  return data?.pages.flatMap((page) => page.items) ?? [];
}

/** Replaces the row of `order` in the loaded pages (a detail answer fits: its timeline rides along unused). */
export function replaceOrderInPages<T extends BuyerOrder | BusinessOrder>(data: OrderPages<T> | undefined, order: T): OrderPages<T> | undefined {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({ ...page, items: page.items.map((item) => (item.id === order.id ? { ...item, ...order } : item)) })),
  };
}

/** «Por confirmar» (PENDING_VERIFICATION) first, then the rest, keeping the backend's order inside each. */
export function splitInbox<T extends { status: string }>(orders: readonly T[]): { pending: T[]; history: T[] } {
  return {
    pending: orders.filter((order) => order.status === 'PENDING_VERIFICATION'),
    history: orders.filter((order) => order.status !== 'PENDING_VERIFICATION'),
  };
}
