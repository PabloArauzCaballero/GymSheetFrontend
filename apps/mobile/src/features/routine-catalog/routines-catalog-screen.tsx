import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import {
  activeFilterCount,
  emptyCatalogFilters,
  hasActiveFilters,
  isPendingInvitation,
  ORDER_LABELS,
  type CatalogFilterState,
  type CatalogTab,
  type MineChip,
} from '@gymsheet/hooks';
import { routineService, routineSharingService } from '@/api/services';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { EmptyState, ErrorState, Skeleton } from '@/components/feedback';
import { ScrollScreen, ScreenHeader, Section } from '@/components/layout';
import { PressableScale } from '@/components/motion';
import { TourTarget, useScreenTour } from '@/components/tour';
import { Button, Input } from '@/components/ui';
import { WeekPlan } from '@/components/week-plan';
import { CatalogFiltersSheet } from '@/features/routine-catalog/catalog-filters';
import { CatalogTabBar, MineChips, ResultCount } from '@/features/routine-catalog/catalog-tab-bar';
import { InvitationCard } from '@/features/routine-catalog/invitation-card';
import { RoutineCardView } from '@/features/routine-catalog/routine-card';
import { useRoutineCatalog } from '@/features/routine-catalog/use-routine-catalog';
import { colors, fontSizes, iconSizes, minTouchTarget, radii, semibold, spacing } from '@/theme';

const EMPTY_COPY: Record<string, { title: string; message: string }> = {
  public: {
    title: 'Aún no hay rutinas públicas con estos filtros',
    message: 'Prueba con otro objetivo o quita algún filtro.',
  },
  official: {
    title: 'Aún no hay rutinas recomendadas',
    message: 'REPP publicará aquí sus rutinas oficiales.',
  },
  created: {
    title: 'No has creado rutinas',
    message: 'Crea tu primera rutina por días y semanas.',
  },
  shared: {
    title: 'Nadie te ha compartido una rutina',
    message: 'Cuando alguien te invite, la verás aquí.',
  },
};

/** Pestaña Rutinas con la bandera `routinesV2` (RF-01). */
export function RoutinesCatalogScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<CatalogTab>('public');
  const [chip, setChip] = useState<MineChip>('created');
  const [filters, setFilters] = useState<CatalogFilterState>(emptyCatalogFilters);
  const [search, setSearch] = useState('');
  const [sheet, setSheet] = useState(false);
  const debounced = useDebouncedValue(search, 350);
  const applied = useMemo(() => ({ ...filters, q: debounced }), [filters, debounced]);
  useScreenTour('routines');

  const catalog = useRoutineCatalog(tab, chip, applied);
  const assignments = useQuery({
    queryKey: ['routines', 'assignments', 'me'],
    queryFn: () => routineService.myAssignments(),
  });
  const invitations = useQuery({
    queryKey: ['routine-invitations', 'PENDING'],
    queryFn: () => routineSharingService.myInvitations('PENDING'),
  });

  const assigned = assignments.data?.filter((item) => item.estado === 'ACTIVE') ?? [];
  const pending = invitations.data?.length ?? 0;
  const cards = catalog.data?.pages.flatMap((page) => page.items) ?? [];
  const pendingCards = cards.filter(isPendingInvitation);
  const regularCards = cards.filter((card) => !isPendingInvitation(card));
  const emptyKey = tab === 'mine' ? chip : tab;
  const count = activeFilterCount(filters);
  const open = (id: string) => router.push({ pathname: '/routines/[id]', params: { id } });

  return (
    <ScrollScreen
      onRefresh={() => {
        void catalog.refetch();
        void assignments.refetch();
        void invitations.refetch();
      }}
      refreshing={catalog.isRefetching}
    >
      <ScreenHeader subtitle="Descubre, crea y entrena tus planes." title="Rutinas" tourKey="routines" />

      <TourTarget id="routines.create">
        <Button label="Crear rutina" onPress={() => router.push('/routines/new')} />
      </TourTarget>

      {assigned.length > 0 ? (
        <Section icon="calendar-outline" index={0} title="Tu semana">
          <TourTarget id="routines.week">
            <WeekPlan assignments={assigned} onPickRoutine={open} />
          </TourTarget>
        </Section>
      ) : null}

      <CatalogTabBar onChange={setTab} value={tab} />
      {tab === 'mine' ? (
        <MineChips onChange={setChip} pendingInvitations={pending} value={chip} />
      ) : null}

      <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-end' }}>
        <View style={{ flex: 1 }}>
          <Input
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
            icon="search"
            label="Buscar rutinas"
            labelHidden
            onChangeText={setSearch}
            placeholder="Nombre de la rutina…"
            returnKeyType="search"
            testID="routine-search"
            value={search}
          />
        </View>
        {tab === 'public' ? (
          <PressableScale
            accessibilityLabel={count > 0 ? `Filtros, ${count} aplicados` : 'Filtros'}
            onPress={() => setSheet(true)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.xs,
              minHeight: minTouchTarget,
              borderRadius: radii.md,
              borderWidth: 1,
              borderColor: count > 0 ? colors.volt : colors.border,
              backgroundColor: colors.surface,
              paddingHorizontal: spacing.md,
            }}
            testID="open-filters"
          >
            <Ionicons color={colors.text} name="options-outline" size={iconSizes.md} />
            <Text style={{ color: colors.text, fontSize: fontSizes.sm, fontWeight: semibold }}>
              {count > 0 ? `Filtros (${count})` : 'Filtros'}
            </Text>
          </PressableScale>
        ) : null}
      </View>

      {tab === 'public' ? (
        <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>
          Orden: {ORDER_LABELS[filters.orden]}
          {filters.deMiGimnasio ? ' · De mi gimnasio' : ''}
        </Text>
      ) : null}

      <CatalogFiltersSheet
        onChange={setFilters}
        onClose={() => setSheet(false)}
        value={filters}
        visible={sheet}
      />

      {catalog.isPending ? (
        <View style={{ gap: spacing.sm }}>
          <Skeleton height={132} />
          <Skeleton height={132} />
          <Skeleton height={132} />
        </View>
      ) : catalog.isError && !catalog.data ? (
        <ErrorState error={catalog.error} onRetry={() => void catalog.refetch()} />
      ) : cards.length === 0 ? (
        <EmptyState
          icon="albums-outline"
          message={EMPTY_COPY[emptyKey]?.message ?? ''}
          title={EMPTY_COPY[emptyKey]?.title ?? 'Sin rutinas'}
        >
          {tab === 'public' && hasActiveFilters(applied) ? (
            <Button
              label="Limpiar filtros"
              onPress={() => {
                setFilters(emptyCatalogFilters);
                setSearch('');
              }}
              variant="ghost"
            />
          ) : null}
          {tab === 'mine' && chip === 'created' ? (
            <Button label="Crear rutina" onPress={() => router.push('/routines/new')} />
          ) : null}
        </EmptyState>
      ) : (
        <View style={{ gap: spacing.sm }}>
          {catalog.isError ? (
            <Text
              accessibilityRole="alert"
              style={{ color: colors.warning, fontSize: fontSizes.sm }}
              testID="offline-notice"
            >
              Sin conexión. Mostramos lo último que cargó.
            </Text>
          ) : null}
          <ResultCount hasMore={catalog.hasNextPage} shown={cards.length} />
          {pendingCards.map((card) => (
            <InvitationCard card={card} key={card.id} onAccepted={open} />
          ))}
          {regularCards.map((card) => (
            <RoutineCardView card={card} key={card.id} onPress={() => open(card.id)} />
          ))}
          {catalog.hasNextPage ? (
            <Button
              label="Ver más rutinas"
              loading={catalog.isFetchingNextPage}
              onPress={() => void catalog.fetchNextPage()}
              variant="ghost"
            />
          ) : null}
        </View>
      )}
    </ScrollScreen>
  );
}
