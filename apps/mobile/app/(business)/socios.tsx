import { affiliationCopy } from '@gymsheet/domain';
import { itemsOfPages, queryKeys } from '@gymsheet/hooks';
import type { AffiliationKind, GymAffiliationsPage } from '@gymsheet/schemas';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ScrollView } from 'react-native';
import { EmptyState, ErrorState, RowsSkeleton } from '@/components/feedback';
import { ScreenHeader, ScrollScreen } from '@/components/layout';
import { FilterChip } from '@/components/filter-chip';
import { Button } from '@/components/ui';
import { errorCodeOf, gymAffiliationsService } from '@/features/affiliations/affiliations-service';
import { GymAffiliationRow } from '@/features/affiliations/gym-affiliation-row';
import { listingsService } from '@/features/business-listings/listings-service';
import { spacing } from '@/theme';

type Tab = 'requests' | 'members' | 'coaches';
const TABS: ReadonlyArray<{ id: Tab; label: string; empty: string }> = [
  { id: 'requests', label: affiliationCopy.requests, empty: affiliationCopy.emptyRequests },
  { id: 'members', label: affiliationCopy.members, empty: affiliationCopy.emptyMembers },
  { id: 'coaches', label: affiliationCopy.coaches, empty: affiliationCopy.emptyCoaches },
];

/** «Socios» of a GYM business (plan §4.2): Solicitudes to decide, Socios by sede and Entrenadores. */
export default function BusinessSociosScreen() {
  const [tab, setTab] = useState<Tab>('requests');
  const [kind, setKind] = useState<AffiliationKind | ''>('');
  const [locationId, setLocationId] = useState('');
  const locations = useQuery({ queryKey: queryKeys.business.locations, queryFn: listingsService.locations });
  const key = tab === 'requests' ? queryKeys.business.affiliationRequests(kind, locationId) : tab === 'members' ? queryKeys.business.affiliationMembers(locationId) : queryKeys.business.affiliationCoaches;
  const load = (cursor: string | null): Promise<GymAffiliationsPage> =>
    tab === 'requests'
      ? gymAffiliationsService.requests({ kind: kind || null, locationId: locationId || null, cursor })
      : tab === 'members'
        ? gymAffiliationsService.members({ locationId: locationId || null, cursor })
        : gymAffiliationsService.coaches({ cursor });
  const pages = useInfiniteQuery({ queryKey: key, queryFn: ({ pageParam }) => load(pageParam), initialPageParam: null as string | null, getNextPageParam: (page) => page.nextCursor, retry: false });
  const rows = itemsOfPages(pages.data);
  const sedes = locations.data ?? [];
  const current = TABS.find((item) => item.id === tab) ?? TABS[0];
  return (
    <ScrollScreen onRefresh={() => void pages.refetch()} refreshing={pages.isRefetching}>
      <ScreenHeader detail subtitle="Compara los 3 dígitos del CI con tu registro." title={affiliationCopy.socios} />
      <ScrollView contentContainerStyle={{ gap: spacing.sm }} horizontal showsHorizontalScrollIndicator={false}>
        {TABS.map((item) => <FilterChip key={item.id} label={item.label} onPress={() => setTab(item.id)} selected={tab === item.id} />)}
      </ScrollView>
      {tab !== 'coaches' && sedes.length > 1 ? (
        <ScrollView contentContainerStyle={{ gap: spacing.sm }} horizontal showsHorizontalScrollIndicator={false}>
          <FilterChip label="Todas las sedes" onPress={() => setLocationId('')} selected={locationId === ''} />
          {sedes.map((sede) => <FilterChip key={sede.id} label={sede.name} onPress={() => setLocationId(sede.id)} selected={locationId === sede.id} />)}
        </ScrollView>
      ) : null}
      {tab === 'requests' ? (
        <ScrollView contentContainerStyle={{ gap: spacing.sm }} horizontal showsHorizontalScrollIndicator={false}>
          <FilterChip label="Todos" onPress={() => setKind('')} selected={kind === ''} />
          <FilterChip label="Socios" onPress={() => setKind('SOCIO')} selected={kind === 'SOCIO'} />
          <FilterChip label="Entrenadores" onPress={() => setKind('ENTRENADOR')} selected={kind === 'ENTRENADOR'} />
        </ScrollView>
      ) : null}
      {pages.isPending ? (
        <RowsSkeleton rows={3} />
      ) : pages.isError ? (
        errorCodeOf(pages.error) === 'GYM_NOT_ACTIVE' ? (
          <EmptyState icon="eye-off-outline" message={affiliationCopy.gymNotActive} title="Tu gimnasio no está publicado" />
        ) : (
          <ErrorState error={pages.error} onRetry={() => void pages.refetch()} />
        )
      ) : rows.length === 0 ? (
        <EmptyState icon="people-outline" message={current?.empty ?? ''} title="Nada por aquí" />
      ) : (
        rows.map((row) => <GymAffiliationRow key={row.id} row={row} />)
      )}
      {pages.hasNextPage ? <Button label="Ver más" loading={pages.isFetchingNextPage} onPress={() => void pages.fetchNextPage()} variant="ghost" /> : null}
    </ScrollScreen>
  );
}
