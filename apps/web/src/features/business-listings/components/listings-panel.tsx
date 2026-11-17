'use client';

import { offerKindGroups, type OfferKindGroup } from '@gymsheet/domain';
import { listingsOfPages } from '@gymsheet/hooks';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { queryKeys } from '@/shared/api/query-keys';
import { EmptyState } from '@/shared/components/feedback/empty-state';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { SkeletonList } from '@/shared/components/feedback/skeleton';
import { PageHeader } from '@/shared/components/layout/page-header';
import { Button, ButtonLink } from '@/shared/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { businessListingsService } from '../services/listings-client';
import { ListingRow } from './listing-row';

type Tab = 'all' | OfferKindGroup | 'archived';

/**
 * `/negocio/publicaciones` (plan §4.2): the business's listings by kind, with
 * where each stands, and the way to publish a new one. Archived ones live in
 * their own tab (the backend lists them only when asked).
 */
export function ListingsPanel() {
  const [tab, setTab] = useState<Tab>('all');
  const archived = tab === 'archived';
  const listings = useInfiniteQuery({
    queryKey: queryKeys.business.listingsByStatus(archived ? 'ARCHIVED' : 'OPEN'),
    queryFn: ({ pageParam }) => businessListingsService.list({ cursor: pageParam, ...(archived ? { status: 'ARCHIVED' as const } : {}) }),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor,
  });
  const group = offerKindGroups.find((item) => item.id === tab);
  const items = listingsOfPages(listings.data).filter((listing) => !group || group.kinds.includes(listing.offerKind));

  return (
    <div className="grid gap-6">
      <PageHeader
        actions={
          <ButtonLink href="/negocio/publicaciones/nueva" variant="primary">
            <Plus aria-hidden className="size-5" />
            Nueva publicación
          </ButtonLink>
        }
        description="Planes, pases, clases y productos que vendes en REPP."
        title="Publicaciones"
      />
      <Tabs onValueChange={(value) => setTab(value as Tab)} value={tab}>
        <TabsList aria-label="Tipo de publicación">
          <TabsTrigger value="all">Todas</TabsTrigger>
          {offerKindGroups.map((item) => (
            <TabsTrigger key={item.id} value={item.id}>
              {item.label}
            </TabsTrigger>
          ))}
          <TabsTrigger value="archived">Archivadas</TabsTrigger>
        </TabsList>
      </Tabs>
      {listings.isPending ? (
        <SkeletonList />
      ) : listings.isError ? (
        <ErrorPanel error={listings.error} message={listings.error.message} onRetry={() => void listings.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          action={archived ? undefined : <ButtonLink href="/negocio/publicaciones/nueva">Publica la primera</ButtonLink>}
          description={archived ? 'Lo que archives queda aquí, fuera del marketplace.' : 'Publica un plan, un pase o un producto: sale en el marketplace en segundos.'}
          flat
          title={archived ? 'Nada archivado' : 'Todavía no publicaste nada'}
        />
      ) : (
        <ul aria-label="Tus publicaciones" className="m-0 grid list-none gap-1 rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--surface-low)] p-2">
          {items.map((listing) => (
            <ListingRow key={listing.id} listing={listing} />
          ))}
        </ul>
      )}
      {listings.hasNextPage ? (
        <Button className="justify-self-center" loading={listings.isFetchingNextPage} onClick={() => void listings.fetchNextPage()} variant="ghost">
          Ver más
        </Button>
      ) : null}
    </div>
  );
}
