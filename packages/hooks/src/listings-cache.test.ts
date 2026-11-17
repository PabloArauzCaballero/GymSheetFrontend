import { describe, expect, it } from 'vitest';
import type { OwnListing } from '@gymsheet/schemas';
import { listingsOfPages, prependListingToPages, replaceListingInPages } from './listings-cache';

const listing = (id: string, name = id): OwnListing => ({
  id,
  offerKind: 'DAY_PASS',
  name,
  description: 'Una visita.',
  benefits: [],
  price: '30.00',
  currency: 'BOB',
  validityDays: null,
  sessionsCount: null,
  stockQuantity: null,
  stockReserved: 0,
  productCategoryId: null,
  displayOrder: 0,
  mediaUrls: [],
  status: 'ACTIVE',
  moderationStatus: 'LIVE',
  moderationReasonCode: null,
  autoCheckCodes: [],
  visibility: 'PUBLIC',
  publishedAt: null,
  createdAt: '',
  updatedAt: '',
});

describe('listings cache', () => {
  const data = { pages: [{ items: [listing('a'), listing('b')], nextCursor: 'x' }, { items: [listing('c')], nextCursor: null }], pageParams: [null, 'x'] };
  it('replaces a row in place', () => {
    expect(listingsOfPages(replaceListingInPages(data, listing('c', 'nuevo'))).map((item) => item.name)).toEqual(['a', 'b', 'nuevo']);
  });
  it('puts a new listing first, once', () => {
    const once = prependListingToPages(data, listing('z'));
    expect(listingsOfPages(once).map((item) => item.id)).toEqual(['z', 'a', 'b', 'c']);
    expect(prependListingToPages(once, listing('z'))).toBe(once);
    expect(replaceListingInPages(undefined, listing('a'))).toBeUndefined();
  });
});
