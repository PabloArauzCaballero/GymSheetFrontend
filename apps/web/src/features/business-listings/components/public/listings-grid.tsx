'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { queryKeys } from '@/shared/api/query-keys';
import type { PublicListingsPage } from '@/shared/api/schemas';
import { EmptyState } from '@/shared/components/feedback/empty-state';
import { SkeletonCardGrid } from '@/shared/components/feedback/skeleton';
import { Button } from '@/shared/components/ui/button';
import { marketplaceService } from '../../services/listings-client';
import { ListingCard } from './listing-card';

/**
 * Public listings with cursor «Ver más» (`GET /public/directory/listings`).
 * `query` is the backend query without the cursor; the server's first page
 * is the initial data, so the grid is never empty on arrival.
 */
export function ListingsGrid({
  query,
  initial,
  showSeller = true,
  empty,
}: Readonly<{
  query: string;
  /** The page the server rendered and the query it rendered it for (only that query starts from it). */
  initial?: { query: string; page: PublicListingsPage | null };
  showSeller?: boolean;
  empty: { title: string; description: string; action?: ReactNode };
}>) {
  const seed = initial?.page && initial.query === query ? initial.page : null;
  const listings = useInfiniteQuery({
    queryKey: queryKeys.marketplace.search(query),
    queryFn: ({ pageParam, signal }) => marketplaceService.search(pageParam ? `${query}&cursor=${encodeURIComponent(pageParam)}` : query, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor,
    ...(seed ? { initialData: { pages: [seed], pageParams: [null] } } : {}),
    staleTime: 60_000,
  });
  if (listings.isPending) return <SkeletonCardGrid />;
  if (listings.isError) {
    return (
      <EmptyState
        action={<Button onClick={() => void listings.refetch()}>Reintentar</Button>}
        description="No pudimos cargar las publicaciones. Vuelve a intentarlo en un momento."
        flat
        title="Publicaciones no disponibles"
      />
    );
  }
  const items = listings.data.pages.flatMap((page) => page.items);
  if (items.length === 0) return <EmptyState action={empty.action} description={empty.description} flat mascot="asleep" title={empty.title} />;
  return (
    <div className="grid gap-6">
      <ul aria-label="Publicaciones" className="m-0 grid list-none grid-cols-2 gap-x-4 gap-y-6 p-0 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((listing) => (
          <li key={listing.id}>
            <ListingCard listing={listing} showSeller={showSeller} />
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
