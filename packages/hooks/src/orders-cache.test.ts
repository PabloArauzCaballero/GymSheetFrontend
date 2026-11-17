import { describe, expect, it } from 'vitest';
import { ordersOfPages, replaceOrderInPages, splitInbox } from './orders-cache';

type Row = { id: string; status: string; amount: string };
const page = (items: Row[]) => ({ items, nextCursor: null });

describe('orders cache', () => {
  it('flattens the loaded pages in order', () => {
    expect(ordersOfPages({ pages: [page([{ id: 'a', status: 'CONFIRMED', amount: '1' }]), page([{ id: 'b', status: 'REJECTED', amount: '2' }])], pageParams: [] }).map((row) => row.id)).toEqual(['a', 'b']);
    expect(ordersOfPages(undefined)).toEqual([]);
  });

  it('replaces only the written row', () => {
    const data = { pages: [page([{ id: 'a', status: 'PENDING_VERIFICATION', amount: '1' }, { id: 'b', status: 'PENDING_PAYMENT', amount: '2' }])], pageParams: [null] };
    // The helper is typed for orders; the shape it touches is only `id`.
    const next = replaceOrderInPages(data as never, { id: 'a', status: 'CONFIRMED', amount: '1' } as never) as unknown as typeof data;
    expect(next.pages[0]?.items.map((row) => row.status)).toEqual(['CONFIRMED', 'PENDING_PAYMENT']);
    expect(replaceOrderInPages(undefined, {} as never)).toBeUndefined();
  });

  it('puts «Por confirmar» first and keeps the backend order inside each part', () => {
    const rows = [
      { id: '1', status: 'PENDING_VERIFICATION' },
      { id: '2', status: 'CONFIRMED' },
      { id: '3', status: 'PENDING_VERIFICATION' },
      { id: '4', status: 'PENDING_PAYMENT' },
    ];
    const { pending, history } = splitInbox(rows);
    expect(pending.map((row) => row.id)).toEqual(['1', '3']);
    expect(history.map((row) => row.id)).toEqual(['2', '4']);
  });
});
