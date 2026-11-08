import { Ionicons } from '@expo/vector-icons';
import type { DirectoryEntitySummary } from '@gymsheet/schemas';
import { View } from 'react-native';
import { MediaImage } from '@/components/media-image';
import { PressableScale } from '@/components/motion';
import { Text } from '@/components/text';
import { colors, radii, spacing } from '@/theme';
import { initials, ratingLabel, sellerKindLabel } from './format';

/** Una tienda o gimnasio: portada, nombre y una línea de datos honestos. */
export function SellerCard({ seller, onPress }: { seller: DirectoryEntitySummary; onPress: () => void }) {
  const meta = [sellerKindLabel(seller.entityType), seller.city].filter(Boolean).join(' · ');
  const rating = ratingLabel(seller.ratingAverage, seller.ratingCount);

  return (
    <PressableScale
      accessibilityLabel={`${seller.name}, ${meta}, ${rating}`}
      accessibilityRole="button"
      onPress={onPress}
      style={{ flex: 1, gap: spacing.sm }}
    >
      <MediaImage
        uri={seller.coverUrl ?? seller.logoUrl}
        style={{ aspectRatio: 4 / 3, borderRadius: radii.lg, borderCurve: 'continuous' }}
        fallback={
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text tone="muted" variant="title">
              {initials(seller.name)}
            </Text>
          </View>
        }
      />
      <View style={{ gap: spacing.xxs }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <Text numberOfLines={1} strong style={{ flexShrink: 1 }} variant="subhead">
            {seller.name}
          </Text>
          {seller.isVerified ? (
            <Ionicons accessibilityLabel="Verificado" color={colors.accentInk} name="checkmark-circle" size={14} />
          ) : null}
        </View>
        <Text numberOfLines={1} tone="muted" variant="caption">
          {meta}
        </Text>
        <Text tabular tone="secondary" variant="caption">
          {rating}
        </Text>
      </View>
    </PressableScale>
  );
}
