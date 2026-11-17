import type { OfferKind } from '@gymsheet/schemas';
import { offerKinds } from '@gymsheet/schemas';
import { categoryById, MARKETPLACE_CATEGORIES, type MarketplaceCategoryId, type MarketplaceFilters } from './marketplace-categories';
import { parsePriceInput } from './business-listings';

/**
 * The marketplace search (franja 8c, plan §4.3) as one value shared by web and
 * mobile: what the person picked ⇄ the page URL (Spanish keys, shareable) ⇄
 * the backend query of `GET /public/directory/listings` (snake case, strict:
 * an unknown key is a 400, so only known keys are ever written).
 */

export type ListingSort = 'recent' | 'price_asc' | 'price_desc';

export const LISTING_SORTS: ReadonlyArray<{ id: ListingSort; label: string }> = [
  { id: 'recent', label: 'Lo más nuevo' },
  { id: 'price_asc', label: 'Precio: menor a mayor' },
  { id: 'price_desc', label: 'Precio: mayor a menor' },
];

export type MarketplaceQuery = {
  /** Free text, or `@handle` to see one business's listings. */
  q: string;
  category: MarketplaceCategoryId;
  /** «Tipo»: one offer kind, or every kind. */
  offerKind: OfferKind | null;
  city: string;
  /** As typed («250», «250,50»); invalid text is left out of the backend query. */
  priceMin: string;
  priceMax: string;
  verifiedOnly: boolean;
  sort: ListingSort;
  /** Stores tab only: sellers rated 4.5 or more. */
  topRated: boolean;
};

export const DEFAULT_MARKETPLACE_QUERY: MarketplaceQuery = {
  q: '',
  category: 'all',
  offerKind: null,
  city: '',
  priceMin: '',
  priceMax: '',
  verifiedOnly: false,
  sort: 'recent',
  topRated: false,
};

const HANDLE = /^@([a-z0-9][a-z0-9._]{1,28}[a-z0-9])$/iu;

/** «@TopFit» → «topfit»: the search names one business, and the screen offers its profile. */
export function handleFromSearch(text: string): string | null {
  const match = HANDLE.exec(text.trim());
  return match?.[1] ? match[1].toLowerCase() : null;
}

/** The offer kind the search uses: «Tipo» wins over a category that fixes one (Pases). */
export function effectiveOfferKind(query: MarketplaceQuery): OfferKind | null {
  return query.offerKind ?? categoryById(query.category).offerKind ?? null;
}

function cleanCity(city: string): string | null {
  const value = city.trim();
  return value.length >= 2 ? value.slice(0, 100) : null;
}

/** Backend query string (without `?`) of one page of results. */
export function listingSearchParams(
  query: MarketplaceQuery,
  page: { cursor?: string | null; limit?: number; entityId?: string } = {},
): string {
  const params = new URLSearchParams();
  const q = query.q.trim();
  if (q) params.set('q', q.slice(0, 100));
  const kind = effectiveOfferKind(query);
  if (kind) params.set('offer_kind', kind);
  const category = categoryById(query.category);
  if (category.entityType) params.set('entity_type', category.entityType);
  // Store categories narrow by path; for the other kinds the type already says it.
  if (category.entityType === 'STORE' && category.path) params.set('category_path', category.path);
  if (page.entityId) params.set('entity_id', page.entityId);
  const city = cleanCity(query.city);
  if (city) params.set('city', city);
  let min = parsePriceInput(query.priceMin);
  let max = parsePriceInput(query.priceMax);
  // A swapped range would be a 400: it is read the way the person meant it.
  if (min !== null && max !== null && min > max) [min, max] = [max, min];
  if (min !== null) params.set('price_min', String(min));
  if (max !== null) params.set('price_max', String(max));
  if (query.verifiedOnly) params.set('verified_only', 'true');
  if (query.sort !== 'recent') params.set('sort', query.sort);
  if (page.cursor) params.set('cursor', page.cursor);
  params.set('limit', String(page.limit ?? 24));
  return params.toString();
}

/** Page URL keys, in Spanish so a shared link reads well. */
const URL_KEYS = {
  q: 'q',
  category: 'categoria',
  offerKind: 'tipo',
  city: 'ciudad',
  priceMin: 'desde',
  priceMax: 'hasta',
  verifiedOnly: 'verificados',
  sort: 'orden',
  topRated: 'puntaje',
} as const;

export function marketplaceUrlParams(query: MarketplaceQuery): string {
  const params = new URLSearchParams();
  if (query.q.trim()) params.set(URL_KEYS.q, query.q.trim());
  if (query.category !== 'all') params.set(URL_KEYS.category, query.category);
  if (query.offerKind) params.set(URL_KEYS.offerKind, query.offerKind);
  if (query.city.trim()) params.set(URL_KEYS.city, query.city.trim());
  if (query.priceMin.trim()) params.set(URL_KEYS.priceMin, query.priceMin.trim());
  if (query.priceMax.trim()) params.set(URL_KEYS.priceMax, query.priceMax.trim());
  if (query.verifiedOnly) params.set(URL_KEYS.verifiedOnly, '1');
  if (query.sort !== 'recent') params.set(URL_KEYS.sort, query.sort);
  if (query.topRated) params.set(URL_KEYS.topRated, '1');
  return params.toString();
}

/** The reverse: anything unknown in the URL falls back to its default instead of breaking the page. */
export function marketplaceQueryFromParams(get: (key: string) => string | null | undefined): MarketplaceQuery {
  const text = (key: string, max: number) => (get(key) ?? '').slice(0, max);
  const category = get(URL_KEYS.category);
  const kind = get(URL_KEYS.offerKind);
  const sort = get(URL_KEYS.sort);
  return {
    q: text(URL_KEYS.q, 100),
    category: MARKETPLACE_CATEGORIES.some((item) => item.id === category) ? (category as MarketplaceCategoryId) : 'all',
    offerKind: (offerKinds as readonly string[]).includes(kind ?? '') ? (kind as OfferKind) : null,
    city: text(URL_KEYS.city, 100),
    priceMin: text(URL_KEYS.priceMin, 20),
    priceMax: text(URL_KEYS.priceMax, 20),
    verifiedOnly: get(URL_KEYS.verifiedOnly) === '1',
    sort: sort === 'price_asc' || sort === 'price_desc' ? sort : 'recent',
    topRated: get(URL_KEYS.topRated) === '1',
  };
}

export function hasActiveMarketplaceQuery(query: MarketplaceQuery): boolean {
  return marketplaceUrlParams(query) !== '';
}

/** The stores tab keeps its client-side filter (`filterEntities`) over the same choices. */
export function entityFiltersOf(query: MarketplaceQuery): MarketplaceFilters {
  return {
    category: query.category,
    sort: query.topRated ? 'rating' : 'relevance',
    topRated: query.topRated,
    verifiedOnly: query.verifiedOnly,
    search: handleFromSearch(query.q) ? '' : query.q,
  };
}
