import { Ionicons } from '@expo/vector-icons';
import type { EntityPlan } from '@gymsheet/schemas';
import { View } from 'react-native';
import { MediaImage } from '@/components/media-image';
import { PressableScale } from '@/components/motion';
import { Text } from '@/components/text';
import { colors, radii, spacing } from '@/theme';
import { formatPrice, offerKindLabel } from './format';

const KIND_ICON: Record<EntityPlan['type'], keyof typeof Ionicons.glyphMap> = {
  MEMBERSHIP_PLAN: 'card-outline',
  PASS: 'ticket-outline',
  PRODUCT: 'bag-outline',
  SERVICE: 'barbell-outline',
};

/**
 * Una oferta, una acción: tocar la tarjeta. Primero el precio, luego el nombre
 * y quién lo vende. Sin etiquetas, sin botón dentro de la tarjeta.
 */
export function OfferCard({ plan, onPress }: { plan: EntityPlan; onPress: () => void }) {
  const price = formatPrice(plan.currentPrice, plan.currency, plan.durationDays);
  const uri = plan.mediaUrls?.[0] ?? plan.entity?.coverUrl ?? plan.entity?.logoUrl ?? null;
  const seller = [plan.entity?.name, plan.entity?.city].filter(Boolean).join(' · ');

  return (
    <PressableScale
      accessibilityLabel={`${plan.name}, ${price}${plan.entity?.name ? `, de ${plan.entity.name}` : ''}`}
      accessibilityRole="button"
      onPress={onPress}
      style={{ flex: 1, gap: spacing.sm }}
    >
      <MediaImage
        uri={uri}
        style={{ aspectRatio: 1, borderRadius: radii.lg, borderCurve: 'continuous' }}
        fallback={
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons color={colors.textMuted} name={KIND_ICON[plan.type] ?? 'pricetag-outline'} size={28} />
          </View>
        }
      />
      <View style={{ gap: spacing.xxs }}>
        <Text strong tabular variant="headline">
          {price}
        </Text>
        <Text numberOfLines={2} variant="subhead">
          {plan.name}
        </Text>
        <Text numberOfLines={1} tone="muted" variant="caption">
          {seller || offerKindLabel(plan.type)}
        </Text>
      </View>
    </PressableScale>
  );
}
