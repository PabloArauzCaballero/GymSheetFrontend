import { offerKindGroups, type OfferKindGroup } from '@gymsheet/domain';
import { listingsOfPages, queryKeys } from '@gymsheet/hooks';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { EmptyState, ErrorState, RowsSkeleton } from '@/components/feedback';
import { FilterChip } from '@/components/filter-chip';
import { Card, Divider, ScreenHeader, ScrollScreen } from '@/components/layout';
import { Button } from '@/components/ui';
import { ListingRow } from '@/features/business-listings/listing-row';
import { listingsService } from '@/features/business-listings/listings-service';
import { spacing } from '@/theme';

type Tab = 'all' | OfferKindGroup | 'archived';

/** «Publicaciones» of the business shell (plan §4.2): listings by kind, where each stands, and «Nueva». */
export default function BusinessListingsScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('all');
  const archived = tab === 'archived';
  const listings = useInfiniteQuery({
    queryKey: queryKeys.business.listingsByStatus(archived ? 'ARCHIVED' : 'OPEN'),
    queryFn: ({ pageParam }) => listingsService.list({ cursor: pageParam, ...(archived ? { status: 'ARCHIVED' as const } : {}) }),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor,
  });
  const group = offerKindGroups.find((item) => item.id === tab);
  const items = listingsOfPages(listings.data).filter((listing) => !group || group.kinds.includes(listing.offerKind));
  const tabs: Array<{ id: Tab; label: string }> = [{ id: 'all', label: 'Todas' }, ...offerKindGroups.map(({ id, label }) => ({ id, label })), { id: 'archived', label: 'Archivadas' }];

  return (
    <ScrollScreen onRefresh={() => void listings.refetch()} refreshing={listings.isRefetching}>
      <ScreenHeader subtitle="Planes, pases, clases y productos que vendes en REPP." title="Publicaciones" />
      <Button icon="add" label="Nueva publicación" onPress={() => router.push('/(business)/publicacion-nueva')} />
      <ScrollView contentContainerStyle={{ gap: spacing.sm }} horizontal showsHorizontalScrollIndicator={false}>
        {tabs.map((item) => (
          <FilterChip key={item.id} label={item.label} onPress={() => setTab(item.id)} selected={tab === item.id} />
        ))}
      </ScrollView>
      {listings.isPending ? (
        <RowsSkeleton rows={4} thumb={56} />
      ) : listings.isError ? (
        <ErrorState error={listings.error} onRetry={() => void listings.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          icon="pricetags-outline"
          message={archived ? 'Lo que archives queda aquí, fuera del marketplace.' : 'Publica un plan, un pase o un producto: sale en el marketplace en segundos.'}
          title={archived ? 'Nada archivado' : 'Todavía no publicaste nada'}
        />
      ) : (
        <Card list>
          {items.map((listing, index) => (
            <View key={listing.id}>
              {index > 0 ? <Divider /> : null}
              <ListingRow listing={listing} onPress={() => router.push({ pathname: '/(business)/publicacion/[id]', params: { id: listing.id } })} />
            </View>
          ))}
        </Card>
      )}
      {listings.hasNextPage ? (
        <Button label="Ver más" loading={listings.isFetchingNextPage} onPress={() => void listings.fetchNextPage()} variant="ghost" />
      ) : null}
    </ScrollScreen>
  );
}
