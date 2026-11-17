import { Ionicons } from '@expo/vector-icons';
import { businessOrderChip, buyerOrderChip, formatDateTime, formatMoney, orderDeadline, orderItemLine } from '@gymsheet/domain';
import type { BusinessOrder, BuyerOrder } from '@gymsheet/schemas';
import { View } from 'react-native';
import { Badge } from '@/components/layout';
import { PressableScale } from '@/components/motion';
import { Text } from '@/components/text';
import { colors, comfortableTouchTarget, iconSizes, spacing } from '@/theme';

/**
 * One order in «Mis compras» (who sold it) or in the business inbox (who
 * bought it, with its deadline). The chip says the state in a word.
 */
export function OrderRow({ order, onPress }: { order: BuyerOrder | BusinessOrder; onPress: () => void }) {
  const business = 'buyer' in order;
  const chip = business ? businessOrderChip(order) : buyerOrderChip(order);
  const deadline = business ? orderDeadline(order) : null;
  const title = business ? order.buyer.name : orderItemLine(order);
  const subtitle = business ? `${orderItemLine(order)} · ${order.method === 'CASH' ? 'Efectivo' : 'QR'}` : `${order.seller.name} · ${formatDateTime(order.createdAt)}`;
  const amount = formatMoney(order.amount, order.currency);
  return (
    <PressableScale
      accessibilityLabel={`${title}, ${amount}, ${chip.label}${deadline ? `, ${deadline.label}` : ''}`}
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.smd, minHeight: comfortableTouchTarget, paddingVertical: spacing.sm }}
    >
      <View style={{ flex: 1, gap: spacing.xxs }}>
        <Text numberOfLines={1} strong variant="body">{title}</Text>
        <Text numberOfLines={1} tone="secondary" variant="footnote">{subtitle}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
          <Badge label={chip.label} tone={chip.tone} />
          {deadline ? <Badge label={deadline.label} tone={deadline.tone} /> : null}
        </View>
      </View>
      <Text strong tabular variant="subhead">{amount}</Text>
      <Ionicons color={colors.textMuted} name="chevron-forward" size={iconSizes.sm} />
    </PressableScale>
  );
}
