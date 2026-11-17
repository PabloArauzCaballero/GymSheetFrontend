import { listingLockText, offerKindName } from '@gymsheet/domain';
import { queryKeys } from '@gymsheet/hooks';
import { listingLimits } from '@gymsheet/schemas';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { ErrorState, RowsSkeleton } from '@/components/feedback';
import { Card, ScreenHeader, ScrollScreen } from '@/components/layout';
import { Text } from '@/components/text';
import { businessService } from '@/features/business/business-service';
import { ListingChip } from '@/features/business-listings/listing-chip';
import { ListingContentSection, ListingPriceSection, ListingStateSection } from '@/features/business-listings/listing-sections';
import { listingsService, photoForm, pickPhotos } from '@/features/business-listings/listings-service';
import { PhotoStrip } from '@/features/business-listings/photo-strip';
import { useListingWrite } from '@/features/business-listings/use-listing-write';
import { confirmDelete, notify } from '@/notifications';
import { radii, spacing, tones } from '@/theme';

/**
 * One listing of the business: where it stands and why, photos, data, price
 * and stock, and pause / resume / archive. While REPP holds it hidden or
 * rejected its content is frozen (409 LISTING_LOCKED_BY_REPP) and the screen
 * says so; the state actions stay open.
 */
export default function ListingEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const listing = useQuery({ queryKey: queryKeys.business.listing(id), queryFn: () => listingsService.get(id) });
  const me = useQuery({ queryKey: queryKeys.business.me, queryFn: businessService.me });
  const add = useListingWrite(id, async (form: FormData) => listingsService.addPhoto(id, form), 'Foto subida.');
  const remove = useListingWrite(id, (position: number) => listingsService.removePhoto(id, position), 'Foto quitada.');

  if (listing.isPending) {
    return (
      <ScrollScreen>
        <RowsSkeleton rows={3} />
      </ScrollScreen>
    );
  }
  if (listing.isError) {
    return (
      <ScrollScreen>
        <ErrorState error={listing.error} onRetry={() => void listing.refetch()} />
      </ScrollScreen>
    );
  }
  const data = listing.data;
  const lock = listingLockText(data.visibility);
  const archived = data.status === 'ARCHIVED';
  const danger = tones.dark.danger;

  async function addPhoto() {
    const picked = await pickPhotos(1);
    if (picked.refused > 0) notify.warning('Solo se aceptan fotos JPG o PNG de hasta 8 MB.');
    const file = picked.files[0];
    if (file) add.mutate(await photoForm(file));
  }
  async function askRemove(position: number) {
    const answer = await confirmDelete({ entity: `la foto ${position + 1} de la publicación` });
    if (answer.confirmed) remove.mutate(position);
  }

  return (
    <ScrollScreen onRefresh={() => void listing.refetch()} refreshing={listing.isRefetching}>
      <ScreenHeader detail subtitle={offerKindName(data.offerKind)} title={data.name} />
      <ListingChip listing={data} withDetail />
      {lock ? (
        <View accessibilityLiveRegion="polite" style={{ padding: spacing.md, borderRadius: radii.lg, borderCurve: 'continuous', borderWidth: 1, borderColor: danger.border, backgroundColor: danger.bg }}>
          <Text style={{ color: danger.text }} variant="subhead">
            {lock}
          </Text>
        </View>
      ) : null}
      <Card>
        <Text accessibilityRole="header" variant="headline">
          Fotos
        </Text>
        <PhotoStrip
          busy={add.isPending || remove.isPending}
          canAdd={!lock && !archived && data.mediaUrls.length < listingLimits.mediaMax}
          label="Fotos de la publicación"
          onAdd={() => void addPhoto()}
          {...(archived ? {} : { onRemove: (position: number) => void askRemove(position) })}
          uris={data.mediaUrls}
        />
      </Card>
      <ListingContentSection entityType={me.data?.entity.entityType ?? null} key={data.updatedAt} listing={data} locked={Boolean(lock)} />
      <ListingPriceSection key={`${data.price}-${data.stockQuantity}`} listing={data} locked={Boolean(lock)} />
      <ListingStateSection listing={data} />
    </ScrollScreen>
  );
}
