import type { OwnListing, OwnListingsPage } from '@gymsheet/schemas';

/**
 * Pure cache updaters of the business «Publicaciones» panel (franja 8c, no
 * React; see ADR-008): a write's answer replaces its row at once, before the
 * background refetch confirms it.
 */
export type ListingPages = { pages: OwnListingsPage[]; pageParams: unknown[] };

export function replaceListingInPages(data: ListingPages | undefined, listing: OwnListing): ListingPages | undefined {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      items: page.items.map((item) => (item.id === listing.id ? listing : item)),
    })),
  };
}

/** A new listing goes first, as the backend lists them (newest first). */
export function prependListingToPages(data: ListingPages | undefined, listing: OwnListing): ListingPages | undefined {
  if (!data || data.pages.length === 0) return data;
  const [first, ...rest] = data.pages;
  if (!first || first.items.some((item) => item.id === listing.id)) return data;
  return { ...data, pages: [{ ...first, items: [listing, ...first.items] }, ...rest] };
}

/** Every listing of the loaded pages, in order. */
export function listingsOfPages(data: ListingPages | undefined): OwnListing[] {
  return data?.pages.flatMap((page) => page.items) ?? [];
}
