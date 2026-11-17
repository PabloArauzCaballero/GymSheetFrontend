import { Ionicons } from '@expo/vector-icons';
import {
  DEFAULT_MARKETPLACE_QUERY,
  businessTypeLabel,
  hoursSummary,
  listingSearchParams,
  offerKindGroups,
  sellerBadgeCopy,
  type OfferKindGroup,
} from '@gymsheet/domain';
import { queryKeys } from '@gymsheet/hooks';
import type { PublicBusinessProfile, PublicListing } from '@gymsheet/schemas';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { FilterChip } from '@/components/filter-chip';
import { Card } from '@/components/layout';
import { MediaImage } from '@/components/media-image';
import { PressableScale } from '@/components/motion';
import { Text } from '@/components/text';
import { WriteToBusiness } from './write-to-business';
import { Button } from '@/components/ui';
import { marketplaceService } from '@/features/business-listings/listings-service';
import { colors, comfortableTouchTarget, iconSizes, radii, spacing } from '@/theme';
import { ListingCard } from './listing-card';

function Listings({ profile, onOpen }: { profile: PublicBusinessProfile; onOpen: (listing: PublicListing) => void }) {
  const [tab, setTab] = useState<'all' | OfferKindGroup>('all');
  const query = listingSearchParams(DEFAULT_MARKETPLACE_QUERY, { entityId: profile.entity.id, limit: 20 });
  const listings = useInfiniteQuery({
    queryKey: queryKeys.marketplace.search(query),
    queryFn: ({ pageParam }) => marketplaceService.search(pageParam ? `${query}&cursor=${encodeURIComponent(pageParam)}` : query),
    initialPageParam: null as string | null,
    initialData: { pages: [profile.listings], pageParams: [null] },
    getNextPageParam: (page) => page.nextCursor,
    staleTime: 60_000,
  });
  const all = listings.data.pages.flatMap((page) => page.items);
  const groups = offerKindGroups.filter((group) => all.some((listing) => group.kinds.includes(listing.offerKind)));
  const kinds = offerKindGroups.find((group) => group.id === tab)?.kinds;
  const shown = kinds ? all.filter((listing) => kinds.includes(listing.offerKind)) : all;
  if (all.length === 0) return <Text tone="secondary" variant="subhead">Todavía no publicó nada. Vuelve pronto.</Text>;
  const rows: PublicListing[][] = [];
  for (let index = 0; index < shown.length; index += 2) rows.push(shown.slice(index, index + 2));
  return (
    <View style={{ gap: spacing.md }}>
      {groups.length > 1 ? (
        <ScrollView contentContainerStyle={{ gap: spacing.sm }} horizontal showsHorizontalScrollIndicator={false}>
          <FilterChip label="Todo" onPress={() => setTab('all')} selected={tab === 'all'} />
          {groups.map((group) => (
            <FilterChip key={group.id} label={group.label} onPress={() => setTab(group.id)} selected={tab === group.id} />
          ))}
        </ScrollView>
      ) : null}
      {rows.map((pair) => (
        <View key={pair[0]?.id} style={{ flexDirection: 'row', gap: spacing.md }}>
          {pair.map((listing) => (
            <ListingCard key={listing.id} listing={listing} onPress={() => onOpen(listing)} showSeller={false} />
          ))}
          {pair.length === 1 ? <View style={{ flex: 1 }} /> : null}
        </View>
      ))}
      {listings.hasNextPage ? <Button label="Ver más" loading={listings.isFetchingNextPage} onPress={() => void listings.fetchNextPage()} variant="ghost" /> : null}
    </View>
  );
}

/**
 * The public profile of a business at `@handle` (plan §4.3): cover, logo,
 * badge, its words, photos, sedes and listings by kind, «Escribir» (8f) and
 * «⋯ Reportar». Reviews and «Hacerme socio» join with franja 8e.
 */
export function PublicProfileView({ profile, onOpen, onReport }: { profile: PublicBusinessProfile; onOpen: (listing: PublicListing) => void; onReport: () => void }) {
  const { entity, handle } = profile;
  return (
    <View style={{ gap: spacing.lg }}>
      {entity.coverUrl ? <MediaImage style={{ aspectRatio: 3, borderRadius: radii.xl, borderCurve: 'continuous' }} uri={entity.coverUrl} /> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <MediaImage accessibilityLabel={`Logo de ${entity.name}`} style={{ width: 64, height: 64, borderRadius: radii.lg, borderCurve: 'continuous' }} uri={entity.logoUrl} />
        <View style={{ flex: 1, gap: spacing.xxs }}>
          <Text tone="secondary" variant="footnote">
            {businessTypeLabel(entity.entityType)}
            {entity.primaryCategory.name ? ` · ${entity.primaryCategory.name}` : ''}
          </Text>
          <Text accessibilityRole="header" variant="title">
            {entity.name}
          </Text>
          <Text tone="secondary" variant="subhead">
            @{handle} · {sellerBadgeCopy[entity.isVerified ? 'VERIFIED' : 'NEW']}
          </Text>
        </View>
      </View>
      <WriteToBusiness entityId={entity.id} />
      {entity.headline ? <Text variant="body">{entity.headline}</Text> : null}
      {entity.description ? <Text tone="secondary" variant="body">{entity.description}</Text> : null}
      {entity.gallery.length > 0 ? (
        <ScrollView accessibilityLabel={`Fotos de ${entity.name}`} contentContainerStyle={{ gap: spacing.sm }} horizontal showsHorizontalScrollIndicator={false}>
          {entity.gallery.map((uri, index) => (
            <MediaImage accessibilityLabel={`Foto ${index + 1} de ${entity.name}`} key={uri} style={{ width: 200, aspectRatio: 4 / 3, borderRadius: radii.lg, borderCurve: 'continuous' }} uri={uri} />
          ))}
        </ScrollView>
      ) : null}
      {profile.locations.length > 0 ? (
        <View style={{ gap: spacing.sm }}>
          <Text accessibilityRole="header" variant="headline">
            {profile.locations.length === 1 ? 'Sede' : 'Sedes'}
          </Text>
          {profile.locations.map((location) => (
            <Card key={location.id}>
              <Text strong variant="body">
                {location.name}
              </Text>
              <Text tone="secondary" variant="footnote">
                {[location.address, location.city].filter(Boolean).join(', ')}
              </Text>
              {hoursSummary(location.businessHours) ? (
                <Text tabular tone="secondary" variant="footnote">
                  {hoursSummary(location.businessHours)}
                </Text>
              ) : null}
            </Card>
          ))}
        </View>
      ) : null}
      <View style={{ gap: spacing.sm }}>
        <Text accessibilityRole="header" variant="headline">
          Lo que ofrece
        </Text>
        <Listings onOpen={onOpen} profile={profile} />
      </View>
      <PressableScale accessibilityLabel="Reportar negocio" haptic="none" onPress={onReport} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: comfortableTouchTarget, alignSelf: 'flex-start' }}>
        <Ionicons color={colors.textMuted} name="flag-outline" size={iconSizes.sm} />
        <Text tone="muted" variant="subhead">
          Reportar
        </Text>
      </PressableScale>
    </View>
  );
}
