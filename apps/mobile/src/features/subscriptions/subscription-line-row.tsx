import { Ionicons } from '@expo/vector-icons';
import { daysLeftText, linePeriodId, offerKindName, periodRangeText, renewListingId, sessionsText, subscriptionChip, subscriptionCopy } from '@gymsheet/domain';
import type { SubscriptionLine } from '@gymsheet/schemas';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { Badge } from '@/components/layout';
import { PressableScale } from '@/components/motion';
import { Text } from '@/components/text';
import { Button } from '@/components/ui';
import { colors, comfortableTouchTarget, iconSizes, spacing } from '@/theme';

/**
 * One plan of «Mis suscripciones»: what it is, its state and the days left
 * (the fact people come for), the open order and «Renovar» to the listing.
 */
export function SubscriptionLineRow({ line, today }: { line: SubscriptionLine; today: string }) {
  const router = useRouter();
  const chip = subscriptionChip(line.status);
  const period = line.current ?? line.upcoming;
  const periodId = linePeriodId(line);
  const renewId = renewListingId(line);
  const days = line.current ? daysLeftText(line.current) : null;
  const facts = [offerKindName(line.listing.offerKind), period ? periodRangeText(period, today) : null, period ? sessionsText(period.sessions) : null].filter(Boolean).join(' · ');
  return (
    <View style={{ gap: spacing.sm, paddingVertical: spacing.sm }} testID="subscription-line">
      <PressableScale
        accessibilityLabel={[line.listing.name, chip.label, days].filter(Boolean).join(', ')}
        disabled={!periodId}
        onPress={() => periodId && router.push({ pathname: '/suscripciones/[id]', params: { id: periodId } })}
        style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.smd, minHeight: comfortableTouchTarget }}
      >
        <View style={{ flex: 1, gap: spacing.xxs }}>
          <Text numberOfLines={1} strong variant="body">{line.listing.name}</Text>
          <Text numberOfLines={2} tone="secondary" variant="footnote">{facts}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs }}>
            <Badge label={chip.label} tone={chip.tone} />
            {days ? <Text strong tabular variant="subhead">{days}</Text> : null}
          </View>
        </View>
        {periodId ? <Ionicons color={colors.textMuted} name="chevron-forward" size={iconSizes.sm} /> : null}
      </PressableScale>
      {line.upcoming && line.current ? <Text tone="secondary" variant="footnote">{subscriptionCopy.upcoming}</Text> : null}
      {line.pendingOrder ? (
        <Button label={subscriptionCopy.openOrder} onPress={() => line.pendingOrder && router.push({ pathname: '/compras/[id]', params: { id: line.pendingOrder.id } })} size="sm" variant="ghost" />
      ) : renewId ? (
        <Button
          label={subscriptionCopy.renew}
          onPress={() => router.push({ pathname: '/publicacion/[id]', params: { id: renewId } })}
          size="sm"
          variant={line.status === 'EXPIRING' || line.status === 'EXPIRED' ? 'primary' : 'ghost'}
        />
      ) : null}
    </View>
  );
}
