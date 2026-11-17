import { describe, expect, it } from 'vitest';
import { itemsOfPages, personAffiliationKeys, removeFromPages, replaceInPages } from './affiliations-cache';

const pages = { pages: [{ items: [{ id: 'a', n: 1 }, { id: 'b', n: 2 }], nextCursor: 'c' }, { items: [{ id: 'c', n: 3 }], nextCursor: null }], pageParams: [null, 'c'] };

describe('affiliations cache', () => {
  it('drops a decided row and replaces an answered one', () => {
    expect(itemsOfPages(removeFromPages(pages, 'b')).map((row) => row.id)).toEqual(['a', 'c']);
    expect(itemsOfPages(replaceInPages(pages, { id: 'c', n: 9 }))[2]).toEqual({ id: 'c', n: 9 });
    expect(removeFromPages(undefined, 'a')).toBeUndefined();
  });
  it('refreshes «Mi gimnasio», the own list and the ranking after a change', () => {
    expect(personAffiliationKeys()).toEqual([['me', 'gym'], ['affiliations', 'mine'], ['progression', 'leaderboard']]);
  });
});
