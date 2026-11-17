import { queryKeys } from '@gymsheet/hooks';
import type { PublicListing } from '@gymsheet/schemas';
import { useInfiniteQuery } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { ActivityIndicator, FlatList, View, type StyleProp, type ViewStyle } from 'react-native';
import { EmptyState, ErrorState } from '@/components/feedback';
import { Button } from '@/components/ui';
import { marketplaceService } from '@/features/business-listings/listings-service';
import { colors, spacing } from '@/theme';
import { ListingCard } from './listing-card';

/**
 * Public listings in two columns with cursor «Ver más» (`GET
 * /public/directory/listings`, ADR-0022). `query` is the backend query
 * without the cursor (built by `listingSearchParams`).
 */
export function ListingsFeed({
  query,
  onOpen,
  header,
  contentStyle,
  emptyMessage,
}: {
  query: string;
  onOpen: (listing: PublicListing) => void;
  header?: ReactElement | null;
  contentStyle?: StyleProp<ViewStyle>;
  emptyMessage: string;
}) {
  const listings = useInfiniteQuery({
    queryKey: queryKeys.marketplace.search(query),
    queryFn: ({ pageParam, signal }) => marketplaceService.search(pageParam ? `${query}&cursor=${encodeURIComponent(pageParam)}` : query, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor,
    staleTime: 60_000,
  });
  if (listings.isPending) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.textMuted} size="large" />
      </View>
    );
  }
  if (listings.isError) {
    return (
      <View style={{ flex: 1, padding: spacing.xl }}>
        <ErrorState error={listings.error} onRetry={() => void listings.refetch()} />
      </View>
    );
  }
  const items = listings.data.pages.flatMap((page) => page.items);
  return (
    <FlatList
      ListEmptyComponent={<EmptyState icon="storefront-outline" mascot="asleep" message={emptyMessage} title="Nada por aquí todavía" />}
      ListFooterComponent={
        listings.hasNextPage ? (
          <Button label="Ver más" loading={listings.isFetchingNextPage} onPress={() => void listings.fetchNextPage()} variant="ghost" />
        ) : null
      }
      ListHeaderComponent={header}
      columnWrapperStyle={{ gap: spacing.md }}
      contentContainerStyle={[{ gap: spacing.lg, paddingHorizontal: spacing.lg }, contentStyle]}
      data={items}
      key="marketplace-grid-listings"
      keyExtractor={(item) => item.id}
      numColumns={2}
      onRefresh={() => void listings.refetch()}
      refreshing={listings.isRefetching && !listings.isFetchingNextPage}
      renderItem={({ item }) => <ListingCard listing={item} onPress={() => onOpen(item)} />}
    />
  );
}
