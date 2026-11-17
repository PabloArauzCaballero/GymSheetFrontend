import { affiliationCopy, gymHandleOf } from '@gymsheet/domain';
import { itemsOfPages, queryKeys } from '@gymsheet/hooks';
import type { Affiliation } from '@gymsheet/schemas';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ScrollView } from 'react-native';
import { EmptyState, ErrorState, RowsSkeleton } from '@/components/feedback';
import { Card, ScreenHeader, ScrollScreen } from '@/components/layout';
import { FilterChip } from '@/components/filter-chip';
import { Text } from '@/components/text';
import { Button, Input } from '@/components/ui';
import { affiliationErrorText, coachGymLinksService } from '@/features/affiliations/affiliations-service';
import { OwnAffiliationRow } from '@/features/affiliations/own-affiliation-row';
import { marketplaceService } from '@/features/business-listings/listings-service';
import { useDebouncedValue } from '@/features/marketplace/use-debounced-value';
import { notify } from '@/notifications';
import { spacing } from '@/theme';

/** «Pedir vínculo»: the gym's @handle and, when it has sedes, an optional one. */
function RequestLink() {
  const client = useQueryClient();
  const [handle, setHandle] = useState('');
  const [locationId, setLocationId] = useState('');
  const typed = useDebouncedValue(gymHandleOf(handle), 400);
  // Only a hint while typing: an unknown handle is not an error to announce.
  const profile = useQuery({ queryKey: queryKeys.marketplace.profile(typed), queryFn: () => marketplaceService.profile(typed).catch(() => null), enabled: typed.length >= 3 });
  const gym = profile.data && !('redirectTo' in profile.data) && profile.data.entity.entityType === 'GYM' ? profile.data : null;
  const send = useMutation({
    mutationFn: () => coachGymLinksService.request({ gymHandle: gymHandleOf(handle), ...(locationId ? { locationId } : {}) }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.business.gymLinks });
      notify.success(affiliationCopy.sentToast);
      setHandle('');
      setLocationId('');
    },
  });
  return (
    <Card>
      <Input autoCapitalize="none" autoCorrect={false} label={affiliationCopy.handleLabel} onChangeText={setHandle} placeholder="@tugimnasio" value={handle} />
      {gym ? <Text tone="secondary" variant="footnote">{gym.entity.name}</Text> : null}
      {gym && gym.locations.length > 0 ? (
        <ScrollView contentContainerStyle={{ gap: spacing.sm }} horizontal showsHorizontalScrollIndicator={false}>
          <FilterChip label="Cualquier sede" onPress={() => setLocationId('')} selected={locationId === ''} />
          {gym.locations.map((location) => <FilterChip key={location.id} label={location.name} onPress={() => setLocationId(location.id)} selected={locationId === location.id} />)}
        </ScrollView>
      ) : null}
      {send.error ? <Text accessibilityRole="alert" tone="danger" variant="subhead">{affiliationErrorText(send.error, true)}</Text> : null}
      <Button disabled={!gymHandleOf(handle)} label={affiliationCopy.requestLink} loading={send.isPending} onPress={() => send.mutate()} />
    </Card>
  );
}

/** «Mis gimnasios» of a COACH business (plan §4.2): ask by @handle, follow the state, cancel or leave. */
export default function CoachGymLinksScreen() {
  const client = useQueryClient();
  const pages = useInfiniteQuery({
    queryKey: queryKeys.business.gymLinks,
    queryFn: ({ pageParam }) => coachGymLinksService.list({ cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor,
  });
  const close = useMutation({
    mutationFn: (row: Affiliation) => (row.status === 'REQUESTED' ? coachGymLinksService.cancel(row.id) : coachGymLinksService.end(row.id)),
    onSuccess: () => void client.invalidateQueries({ queryKey: queryKeys.business.gymLinks }),
    onError: (error) => notify.error(affiliationErrorText(error)),
  });
  const rows = itemsOfPages(pages.data);
  return (
    <ScrollScreen onRefresh={() => void pages.refetch()} refreshing={pages.isRefetching}>
      <ScreenHeader detail subtitle="Pide a los gimnasios donde entrenas a gente que te muestren." title={affiliationCopy.myGyms} />
      <RequestLink />
      {pages.isPending ? (
        <RowsSkeleton rows={2} thumb={0} />
      ) : pages.isError ? (
        <ErrorState error={pages.error} onRetry={() => void pages.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState icon="business-outline" message={affiliationCopy.emptyLinks} title="Todavía sin gimnasios" />
      ) : (
        rows.map((row) => <OwnAffiliationRow busy={close.isPending && close.variables?.id === row.id} coach key={row.id} onClose={(item) => close.mutate(item)} row={row} />)
      )}
      {pages.hasNextPage ? <Button label="Ver más" loading={pages.isFetchingNextPage} onPress={() => void pages.fetchNextPage()} variant="ghost" /> : null}
    </ScrollScreen>
  );
}
