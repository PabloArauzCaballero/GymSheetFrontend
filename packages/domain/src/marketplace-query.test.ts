import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MARKETPLACE_QUERY,
  entityFiltersOf,
  handleFromSearch,
  hasActiveMarketplaceQuery,
  listingSearchParams,
  marketplaceQueryFromParams,
  marketplaceUrlParams,
  type MarketplaceQuery,
} from './marketplace-query';

const query = (patch: Partial<MarketplaceQuery>): MarketplaceQuery => ({ ...DEFAULT_MARKETPLACE_QUERY, ...patch });

describe('listingSearchParams (backend keys)', () => {
  it('sends only the default page size without filters', () => {
    expect(listingSearchParams(DEFAULT_MARKETPLACE_QUERY)).toBe('limit=24');
  });
  it('maps every filter to its snake-case key', () => {
    const params = new URLSearchParams(
      listingSearchParams(
        query({ q: ' proteína ', category: 'supplements', offerKind: 'PRODUCT', city: 'Santa Cruz', priceMin: '100', priceMax: '1.250,50', verifiedOnly: true, sort: 'price_asc' }),
        { cursor: 'abc', limit: 10 },
      ),
    );
    expect(Object.fromEntries(params)).toEqual({
      q: 'proteína',
      offer_kind: 'PRODUCT',
      entity_type: 'STORE',
      category_path: 'tiendas.nutricion',
      city: 'Santa Cruz',
      price_min: '100',
      price_max: '1250.5',
      verified_only: 'true',
      sort: 'price_asc',
      cursor: 'abc',
      limit: '10',
    });
  });
  it('lets a category fix the kind, reads a swapped range and drops what the backend would refuse', () => {
    const params = new URLSearchParams(listingSearchParams(query({ category: 'passes', priceMin: '500', priceMax: '100', city: 'x' })));
    expect(params.get('offer_kind')).toBe('DAY_PASS');
    expect([params.get('price_min'), params.get('price_max')]).toEqual(['100', '500']);
    expect(params.has('city')).toBe(false);
    expect(new URLSearchParams(listingSearchParams(query({ priceMin: 'barato' }))).has('price_min')).toBe(false);
  });
  it('pins a business for its profile page', () => {
    expect(new URLSearchParams(listingSearchParams(DEFAULT_MARKETPLACE_QUERY, { entityId: 'e1' })).get('entity_id')).toBe('e1');
  });
  it('never sends the stores-only rating filter', () => {
    expect(listingSearchParams(query({ topRated: true }))).toBe('limit=24');
  });
});

describe('page URL ⇄ query', () => {
  it('round-trips every choice', () => {
    const original = query({ q: '@topfit', category: 'gyms', offerKind: 'MEMBERSHIP', city: 'La Paz', priceMin: '1', priceMax: '9', verifiedOnly: true, sort: 'price_desc', topRated: true });
    const params = new URLSearchParams(marketplaceUrlParams(original));
    expect(marketplaceQueryFromParams((key) => params.get(key))).toEqual(original);
  });
  it('falls back to defaults on unknown values', () => {
    const params = new URLSearchParams('categoria=nope&tipo=FOO&orden=random');
    expect(marketplaceQueryFromParams((key) => params.get(key))).toEqual(DEFAULT_MARKETPLACE_QUERY);
    expect(hasActiveMarketplaceQuery(DEFAULT_MARKETPLACE_QUERY)).toBe(false);
  });
});

describe('@handle search', () => {
  it('recognizes a handle and lowercases it', () => {
    expect(handleFromSearch(' @TopFit ')).toBe('topfit');
    expect(handleFromSearch('@a')).toBeNull();
    expect(handleFromSearch('top fit')).toBeNull();
  });
  it('does not filter the stores tab by a handle', () => {
    expect(entityFiltersOf(query({ q: '@topfit' })).search).toBe('');
    expect(entityFiltersOf(query({ q: 'top', topRated: true }))).toMatchObject({ search: 'top', sort: 'rating', topRated: true });
  });
});
