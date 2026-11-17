import { ApiError } from '@gymsheet/api-client';
import { daysLeftText, formatDateTime, historyEntryText, offerKindName, periodRangeText, sessionsText, subscriptionChip, subscriptionCopy } from '@gymsheet/domain';
import { queryKeys } from '@gymsheet/hooks';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';
import { EmptyState, ErrorState, RowsSkeleton } from '@/components/feedback';
import { Badge, Card, Divider, ScreenHeader, ScrollScreen } from '@/components/layout';
import { Text } from '@/components/text';
import { Button } from '@/components/ui';
import { personSubscriptionsService } from '@/features/subscriptions/subscriptions-service';
import { spacing } from '@/theme';

/** One period of «Mis suscripciones»: its days, sessions, «Renovar» and history. Someone else's is a 404. */
export default function SubscriptionScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const detail = useQuery({ queryKey: queryKeys.subscriptions.detail(id ?? ''), queryFn: () => personSubscriptionsService.get(id ?? ''), enabled: Boolean(id) });
  const data = detail.data;
  const chip = data ? subscriptionChip(data.status) : null;
  const days = data ? daysLeftText(data) : null;
  const sessions = data ? sessionsText(data.sessions) : null;
  const renewId = data?.renew?.available ? data.renew.listingId : null;
  return (
    <ScrollScreen onRefresh={() => void detail.refetch()} refreshing={detail.isRefetching}>
      <ScreenHeader detail subtitle={data ? [offerKindName(data.listing.offerKind), data.seller?.name].filter(Boolean).join(' · ') : undefined} title={data?.listing.name ?? 'Suscripción'} />
      {detail.isPending ? (
        <RowsSkeleton rows={3} />
      ) : detail.isError ? (
        detail.error instanceof ApiError && detail.error.status === 404 ? (
          <EmptyState icon="card-outline" message="No es tuya o el enlace está mal." title="No encontramos esta suscripción" />
        ) : (
          <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
        )
      ) : data && chip ? (
        <>
          <Card>
            <View style={{ gap: spacing.sm }}>
              <Badge label={chip.label} tone={chip.tone} />
              {days ? <Text tabular variant="title">{days}</Text> : null}
              <Text strong variant="body">{periodRangeText(data)}</Text>
              {sessions ? <Text tone="secondary" variant="subhead">{sessions}</Text> : null}
            </View>
          </Card>
          {renewId ? <Button label={subscriptionCopy.renew} onPress={() => router.push({ pathname: '/publicacion/[id]', params: { id: renewId } })} /> : null}
          {data.history.length > 0 ? (
            <View style={{ gap: spacing.sm }}>
              <Text accessibilityRole="header" variant="headline">{subscriptionCopy.history}</Text>
              <Card list>
                {data.history.map((entry, index) => (
                  <View key={`${entry.at}-${entry.toStatus}`} style={{ gap: spacing.xxs, paddingVertical: spacing.sm }}>
                    {index > 0 ? <Divider /> : null}
                    <Text strong variant="body">{historyEntryText(entry)}</Text>
                    <Text tone="secondary" variant="footnote">{formatDateTime(entry.at)}</Text>
                  </View>
                ))}
              </Card>
            </View>
          ) : null}
        </>
      ) : null}
    </ScrollScreen>
  );
}
