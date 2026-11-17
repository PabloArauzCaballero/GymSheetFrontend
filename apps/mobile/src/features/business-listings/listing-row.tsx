import { formatPrice, listingTerms, offerKindName } from '@gymsheet/domain';
import type { OwnListing } from '@gymsheet/schemas';
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { MediaImage } from '@/components/media-image';
import { PressableScale } from '@/components/motion';
import { Text } from '@/components/text';
import { colors, comfortableTouchTarget, iconSizes, radii, spacing } from '@/theme';
import { ListingChip } from './listing-chip';

const THUMB = 56;

/** One row of «Publicaciones»: photo, name, price and terms, where it stands. The row opens it. */
export function ListingRow({ listing, onPress }: { listing: OwnListing; onPress: () => void }) {
  const terms = listingTerms(listing);
  const price = formatPrice(listing.price, listing.currency);
  return (
    <PressableScale
      accessibilityLabel={`${listing.name}, ${price}`}
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.smd, minHeight: comfortableTouchTarget, paddingVertical: spacing.sm }}
    >
      <MediaImage
        fallback={
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons color={colors.textMuted} name="image-outline" size={iconSizes.md} />
          </View>
        }
        style={{ width: THUMB, height: THUMB, borderRadius: radii.md, borderCurve: 'continuous' }}
        uri={listing.mediaUrls[0] ?? null}
      />
      <View style={{ flex: 1, gap: spacing.xxs }}>
        <Text numberOfLines={1} strong variant="body">
          {listing.name}
        </Text>
        <Text numberOfLines={1} tabular tone="secondary" variant="footnote">
          {price} · {offerKindName(listing.offerKind)}
          {terms ? ` · ${terms}` : ''}
        </Text>
        <ListingChip listing={listing} />
      </View>
      <Ionicons color={colors.textMuted} name="chevron-forward" size={iconSizes.sm} />
    </PressableScale>
  );
}
