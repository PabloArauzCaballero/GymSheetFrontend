import { Ionicons } from '@expo/vector-icons';
import { formatPrice, listingTerms, offerKindName, sellerBadgeCopy } from '@gymsheet/domain';
import type { PublicListing } from '@gymsheet/schemas';
import { View } from 'react-native';
import { MediaImage } from '@/components/media-image';
import { PressableScale } from '@/components/motion';
import { Text } from '@/components/text';
import { colors, iconSizes, radii, spacing } from '@/theme';

/** One listing, one action: the card. Price first, then the name, the seller and its badge. */
export function ListingCard({ listing, onPress, showSeller = true }: { listing: PublicListing; onPress: () => void; showSeller?: boolean }) {
  const price = formatPrice(listing.price, listing.currency);
  const terms = listingTerms(listing);
  const badge = sellerBadgeCopy[listing.seller.badge];
  return (
    <PressableScale
      accessibilityLabel={`${listing.name}, ${price}${showSeller ? `, de ${listing.seller.name}, ${badge}` : ''}`}
      onPress={onPress}
      style={{ flex: 1, gap: spacing.sm }}
    >
      <MediaImage
        fallback={
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons color={colors.textMuted} name="pricetag-outline" size={iconSizes.xl} />
          </View>
        }
        style={{ aspectRatio: 1, borderRadius: radii.lg, borderCurve: 'continuous' }}
        uri={listing.mediaUrls[0] ?? listing.seller.logoUrl}
      />
      <View style={{ gap: spacing.xxs }}>
        <Text strong tabular variant="headline">
          {price}
        </Text>
        <Text numberOfLines={2} variant="subhead">
          {listing.name}
        </Text>
        <Text numberOfLines={1} tone="muted" variant="caption">
          {offerKindName(listing.offerKind)}
          {terms ? ` · ${terms}` : ''}
        </Text>
        {showSeller ? (
          <>
            <Text numberOfLines={1} tone="muted" variant="caption">
              {[listing.seller.name, listing.seller.city].filter(Boolean).join(' · ')}
            </Text>
            <Text numberOfLines={1} tone={listing.seller.badge === 'VERIFIED' ? 'default' : 'muted'} variant="caption">
              {badge}
            </Text>
          </>
        ) : null}
      </View>
    </PressableScale>
  );
}
