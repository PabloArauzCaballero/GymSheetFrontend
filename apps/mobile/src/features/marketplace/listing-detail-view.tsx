import { Ionicons } from '@expo/vector-icons';
import { formatPrice, listingTerms, offerKindName, sellerBadgeCopy } from '@gymsheet/domain';
import type { PublicListing } from '@gymsheet/schemas';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { Card } from '@/components/layout';
import { MediaImage } from '@/components/media-image';
import { PressableScale } from '@/components/motion';
import { Text } from '@/components/text';
import { Button } from '@/components/ui';
import { colors, comfortableTouchTarget, iconSizes, radii, spacing } from '@/theme';

/**
 * A public listing (plan §4.3): photos, price in Bs, what it includes, the
 * seller and the actions. «Comprar» opens the checkout (franja 8d); writing
 * (8f) shows disabled with «Llega pronto»: never a button that leads nowhere.
 */
export function ListingDetailView({
  listing,
  onSeller,
  onReport,
  onBuy,
}: {
  listing: PublicListing;
  onSeller: (handle: string) => void;
  onReport: () => void;
  onBuy: () => void;
}) {
  const { width } = useWindowDimensions();
  const photo = Math.min(width - spacing.lg * 2, 560);
  const terms = listingTerms(listing);
  const seller = listing.seller;
  return (
    <View style={{ gap: spacing.lg }}>
      {listing.mediaUrls.length > 0 ? (
        <ScrollView accessibilityLabel={`Fotos de ${listing.name}`} contentContainerStyle={{ gap: spacing.sm }} decelerationRate="fast" horizontal showsHorizontalScrollIndicator={false} snapToInterval={photo + spacing.sm}>
          {listing.mediaUrls.map((uri, index) => (
            <MediaImage accessibilityLabel={`Foto ${index + 1} de ${listing.mediaUrls.length}`} key={uri} style={{ width: photo, height: photo, borderRadius: radii.xl, borderCurve: 'continuous' }} uri={uri} />
          ))}
        </ScrollView>
      ) : null}
      <View style={{ gap: spacing.xs }}>
        <Text tone="secondary" variant="footnote">
          {offerKindName(listing.offerKind)}
          {listing.productCategory ? ` · ${listing.productCategory.name}` : ''}
        </Text>
        <Text accessibilityRole="header" variant="title">
          {listing.name}
        </Text>
        <Text strong tabular variant="headline">
          {formatPrice(listing.price, listing.currency)}
        </Text>
        {terms ? <Text tone="secondary" variant="subhead">{terms}</Text> : null}
        {listing.inStock === false ? <Text tone="warning" variant="subhead">Sin stock por ahora</Text> : null}
      </View>
      <View style={{ gap: spacing.sm }}>
        <Button
          accessibilityHint={listing.inStock === false ? 'Sin stock: no se puede pedir ahora.' : undefined}
          disabled={listing.inStock === false}
          icon="bag-outline"
          label="Comprar"
          onPress={onBuy}
          testID="listing-buy"
        />
        <Button accessibilityHint="Llega pronto" disabled icon="chatbubble-outline" label="Escribir" onPress={() => undefined} variant="ghost" />
        <Text style={{ textAlign: 'center' }} tone="secondary" variant="footnote">
          Llega pronto: escribirle al negocio desde REPP.
        </Text>
      </View>
      <View style={{ gap: spacing.sm }}>
        <Text accessibilityRole="header" variant="headline">
          Qué incluye
        </Text>
        <Text tone="secondary" variant="body">
          {listing.description}
        </Text>
        {listing.benefits.map((benefit) => (
          <View key={benefit} style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' }}>
            <Ionicons color={colors.textSecondary} name="checkmark" size={iconSizes.sm} />
            <Text style={{ flex: 1 }} variant="body">
              {benefit}
            </Text>
          </View>
        ))}
      </View>
      <Card {...(seller.handle ? { onPress: () => onSeller(seller.handle ?? ''), accessibilityLabel: `Ver el perfil de ${seller.name}` } : {})}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <MediaImage style={{ width: comfortableTouchTarget, height: comfortableTouchTarget, borderRadius: radii.md }} uri={seller.logoUrl} />
          <View style={{ flex: 1, gap: spacing.xxs }}>
            <Text numberOfLines={1} strong variant="body">
              {seller.name}
            </Text>
            <Text numberOfLines={1} tone="secondary" variant="footnote">
              {[seller.handle ? `@${seller.handle}` : null, seller.city].filter(Boolean).join(' · ')}
            </Text>
            <Text tone={seller.badge === 'VERIFIED' ? 'default' : 'muted'} variant="caption">
              {sellerBadgeCopy[seller.badge]}
            </Text>
          </View>
        </View>
      </Card>
      <PressableScale accessibilityLabel="Reportar publicación" haptic="none" onPress={onReport} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: comfortableTouchTarget, alignSelf: 'flex-start' }}>
        <Ionicons color={colors.textMuted} name="flag-outline" size={iconSizes.sm} />
        <Text tone="muted" variant="subhead">
          Reportar
        </Text>
      </PressableScale>
    </View>
  );
}
