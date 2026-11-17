'use client';

import { listingSearchParams, DEFAULT_MARKETPLACE_QUERY, offerKindGroups, type OfferKindGroup } from '@gymsheet/domain';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { queryKeys } from '@/shared/api/query-keys';
import type { PublicListingsPage } from '@/shared/api/schemas';
import { Button } from '@/shared/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { marketplaceService } from '../../services/listings-client';
import { ListingCard } from './listing-card';

/**
 * The business's listings on `/@handle`: grouped by kind (tabs only for the
 * groups it sells), newest first, with cursor «Ver más» over
 * `GET /public/directory/listings?entity_id=…` from the profile's first page.
 */
export function ProfileListings({ entityId, firstPage }: Readonly<{ entityId: string; firstPage: PublicListingsPage }>) {
  const [tab, setTab] = useState<'all' | OfferKindGroup>('all');
  const query = listingSearchParams(DEFAULT_MARKETPLACE_QUERY, { entityId, limit: 20 });
  const listings = useInfiniteQuery({
    queryKey: queryKeys.marketplace.search(query),
    queryFn: ({ pageParam }) => marketplaceService.search(pageParam ? `${query}&cursor=${encodeURIComponent(pageParam)}` : query),
    initialPageParam: null as string | null,
    initialData: { pages: [firstPage], pageParams: [null] },
    getNextPageParam: (page) => page.nextCursor,
    staleTime: 60_000,
  });
  const all = listings.data.pages.flatMap((page) => page.items);
  const groups = offerKindGroups.filter((group) => all.some((listing) => group.kinds.includes(listing.offerKind)));
  const shown = tab === 'all' ? all : all.filter((listing) => offerKindGroups.find((group) => group.id === tab)?.kinds.includes(listing.offerKind));

  if (all.length === 0) {
    return <p className="t-subhead text-[var(--text-muted)]">Todavía no publicó nada. Vuelve pronto.</p>;
  }
  return (
    <div className="grid gap-5">
      {groups.length > 1 ? (
        <Tabs onValueChange={(value) => setTab(value as 'all' | OfferKindGroup)} value={tab}>
          <TabsList aria-label="Tipo de publicación">
            <TabsTrigger value="all">Todo</TabsTrigger>
            {groups.map((group) => (
              <TabsTrigger key={group.id} value={group.id}>
                {group.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      ) : null}
      <ul aria-label="Publicaciones del negocio" className="m-0 grid list-none grid-cols-2 gap-x-4 gap-y-6 p-0 sm:grid-cols-3">
        {shown.map((listing) => (
          <li key={listing.id}>
            <ListingCard listing={listing} showSeller={false} />
          </li>
        ))}
      </ul>
      {listings.hasNextPage ? (
        <Button className="justify-self-center" loading={listings.isFetchingNextPage} onClick={() => void listings.fetchNextPage()} variant="ghost">
          Ver más
        </Button>
      ) : null}
    </div>
  );
}
