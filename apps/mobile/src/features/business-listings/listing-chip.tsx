import { listingChip } from '@gymsheet/domain';
import type { OwnListing } from '@gymsheet/schemas';
import { View } from 'react-native';
import { Badge } from '@/components/layout';
import { Text } from '@/components/text';
import { spacing } from '@/theme';

/** Where the listing stands (from `visibility`) and, when it matters, why. */
export function ListingChip({ listing, withDetail = false }: { listing: OwnListing; withDetail?: boolean }) {
  const chip = listingChip(listing);
  return (
    <View style={{ gap: spacing.xs }}>
      <Badge label={chip.label} tone={chip.tone} />
      {withDetail && chip.detail ? (
        <Text tone="secondary" variant="footnote">
          {chip.detail}
        </Text>
      ) : null}
    </View>
  );
}
