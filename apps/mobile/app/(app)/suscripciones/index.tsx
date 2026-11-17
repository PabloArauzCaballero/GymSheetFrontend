import { affiliationChip, subscriptionCopy } from '@gymsheet/domain';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { EmptyState, ErrorState, RowsSkeleton } from '@/components/feedback';
import { Badge, Card, Divider, ScreenHeader, ScrollScreen } from '@/components/layout';
import { Text } from '@/components/text';
import { Button } from '@/components/ui';
import { SubscriptionLineRow } from '@/features/subscriptions/subscription-line-row';
import { useMySubscriptions } from '@/features/subscriptions/subscriptions-service';
import { spacing } from '@/theme';

/** «Mis suscripciones» under Perfil (franja 8e): every plan bought, grouped by seller. Replaces «Membresía». */
export default function MySubscriptionsScreen() {
  const router = useRouter();
  const subscriptions = useMySubscriptions();
  const groups = subscriptions.data?.items ?? [];
  return (
    <ScrollScreen onRefresh={() => void subscriptions.refetch()} refreshing={subscriptions.isRefetching}>
      <ScreenHeader detail subtitle="Tus planes, sus días y cuándo renovarlos." title={subscriptionCopy.mine} />
      {subscriptions.isPending ? (
        <RowsSkeleton rows={3} />
      ) : subscriptions.isError ? (
        <ErrorState error={subscriptions.error} onRetry={() => void subscriptions.refetch()} />
      ) : groups.length === 0 ? (
        <>
          <EmptyState icon="card-outline" message={subscriptionCopy.emptyMine} title="Todavía no tienes planes" />
          <Button label="Ir al marketplace" onPress={() => router.push('/directorio')} variant="ghost" />
        </>
      ) : (
        groups.map((group) => {
          const live = group.affiliation && (group.affiliation.status === 'REQUESTED' || group.affiliation.status === 'CONFIRMED') ? group.affiliation.status : null;
          const socio = live ? affiliationChip({ kind: 'SOCIO', status: live }) : null;
          return (
            <View key={group.seller?.entityId ?? 'legacy'} style={{ gap: spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <Text accessibilityRole="header" numberOfLines={1} style={{ flex: 1 }} variant="headline">
                  {group.seller?.name ?? subscriptionCopy.legacySeller}
                </Text>
                {socio ? <Badge label={socio.label} tone={socio.tone} /> : null}
              </View>
              <Card list>
                {group.subscriptions.map((line, index) => (
                  <View key={`${line.listing.id ?? line.listing.name}-${line.current?.id ?? line.pendingOrder?.id ?? ''}`}>
                    {index > 0 ? <Divider /> : null}
                    <SubscriptionLineRow line={line} today={subscriptions.data.today} />
                  </View>
                ))}
              </Card>
            </View>
          );
        })
      )}
    </ScrollScreen>
  );
}
