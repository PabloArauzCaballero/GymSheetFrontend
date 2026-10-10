import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import {
  activeFilterCount,
  emptyCatalogFilters,
  hasActiveFilters,
  initialCatalogFilters,
  isoWeekday,
  isPendingInvitation,
  ORDER_LABELS,
  type CatalogFilterState,
  type CatalogTab,
  type MineChip,
} from '@gymsheet/hooks';
import { trainingGoals, type TrainingGoal } from '@gymsheet/types';
import { ApiError } from '@gymsheet/api-client';
import { profileService, routineService, routineSharingService } from '@/api/services';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { EmptyState, ErrorState, Skeleton } from '@/components/feedback';
import { FilterChip } from '@/components/filter-chip';
import { ScrollScreen, ScreenHeader, Section } from '@/components/layout';
import { PressableScale } from '@/components/motion';
import { TourTarget, useScreenTour } from '@/components/tour';
import { ExploreExercisesButton } from '@/features/exercise-browser/explore-exercises-button';
import { Button, Input } from '@/components/ui';
import { WeekPlan } from '@/components/week-plan';
import { useActivePrograms } from '@/features/programs/use-active-programs';
import { CardioProgramCard } from '@/features/cardio/cardio-program-card';
import { StrengthProgramCard } from '@/features/programs/program-card';
import { CatalogFiltersSheet } from '@/features/routine-catalog/catalog-filters';
import { CatalogTabBar, MineChips, ResultCount } from '@/features/routine-catalog/catalog-tab-bar';
import { InvitationCard } from '@/features/routine-catalog/invitation-card';
import { ForYouBlock } from '@/features/routine-catalog/for-you-block';
import { RoutineCardView } from '@/features/routine-catalog/routine-card';
import { useRecommendedRoutines } from '@/features/routine-catalog/use-recommended-routines';
import { useRoutineCatalog } from '@/features/routine-catalog/use-routine-catalog';
import { GOAL_LABEL } from '@/lib/format';
import { colors, fontSizes, iconSizes, minTouchTarget, radii, semibold, spacing } from '@/theme';

const EMPTY_COPY: Record<string, { title: string; message: string }> = {
  public: {
    title: 'Aún no hay rutinas públicas con estos filtros',
    message: 'Prueba con otro objetivo o quita algún filtro.',
  },
  official: {
    title: 'Aún no hay rutinas recomendadas',
    message: 'Las rutinas de REPP aparecerán aquí en cuanto se publiquen.',
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
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<CatalogTab>('public');
  const [chip, setChip] = useState<MineChip>('created');
  const [filters, setFiltersState] = useState<CatalogFilterState>(emptyCatalogFilters);
  // El objetivo del perfil precarga el filtro (C7) una sola vez y solo si la
  // persona no ha tocado los filtros: nunca se pisa una elección suya.
  const touched = useRef(false);
  const setFilters = (next: CatalogFilterState) => {
    touched.current = true;
    setFiltersState(next);
  };
  const [search, setSearch] = useState('');
  const [sheet, setSheet] = useState(false);
  const debounced = useDebouncedValue(search, 350);
  const applied = useMemo(() => ({ ...filters, q: debounced }), [filters, debounced]);
  useScreenTour('routines');

  const profile = useQuery({
    queryKey: ['profile', 'me'],
    queryFn: () => profileService.get(),
    retry: (failures, error) => !(error instanceof ApiError && error.kind === 'not-found') && failures < 1,
  });
  const profileGoal = profile.data?.objetivo ?? null;
  useEffect(() => {
    if (profileGoal && !touched.current) setFiltersState(initialCatalogFilters(profileGoal));
  }, [profileGoal]);

  const forYou = useRecommendedRoutines();
  const catalog = useRoutineCatalog(tab, chip, applied);
  const assignments = useQuery({
    queryKey: ['routines', 'assignments', 'me'],
    queryFn: () => routineService.myAssignments(),
  });
  const invitations = useQuery({
    queryKey: ['routine-invitations', 'PENDING'],
    queryFn: () => routineSharingService.myInvitations('PENDING'),
  });

  const programs = useActivePrograms();
  // ¿Hoy toca pesas? Con el plan de cardio el mismo día se avisa «Haz primero las pesas».
  const strengthRoutine = useQuery({
    queryKey: ['routine', programs.data?.fuerza?.rutinaId],
    queryFn: () => routineService.get(programs.data?.fuerza?.rutinaId ?? ''),
    enabled: Boolean(programs.data?.fuerza?.rutinaId),
  });
  const todayIso = isoWeekday(new Date());
  const strengthToday = Boolean(strengthRoutine.data?.dias.some((day) => day.diaSemana === todayIso));
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
        void forYou.refetch();
        void assignments.refetch();
        void invitations.refetch();
        void queryClient.invalidateQueries({ queryKey: ['programs'] });
      }}
      refreshing={catalog.isRefetching}
    >
      <ScreenHeader title="Rutinas" tourKey="routines" />
      {/* Cabecera: dos acciones secundarias compactas. La principal de la
          pantalla es elegir una rutina (la de «Para ti»), no crearla. */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: -spacing.sm }}>
        <ExploreExercisesButton size="sm" />
        <TourTarget id="routines.create">
          <Button
            icon="add"
            label="Crear rutina"
            onPress={() => router.push('/routines/new')}
            size="sm"
            testID="create-routine"
            variant="secondary"
          />
        </TourTarget>
      </View>

      {programs.data?.fuerza ? <StrengthProgramCard program={programs.data.fuerza} /> : null}
      {programs.data?.cardio ? (
        <CardioProgramCard program={programs.data.cardio} strengthToday={strengthToday} />
      ) : null}
      {programs.data && !programs.data.cardio ? (
        <Button
          icon="pulse-outline"
          label="Añadir plan de cardio"
          onPress={() => router.push('/routines/cardio/new')}
          size="sm"
          style={{ alignSelf: 'flex-start' }}
          variant="ghost"
        />
      ) : null}

      {assigned.length > 0 ? (
        <Section index={0} title="Tu semana">
          <TourTarget id="routines.week">
            <WeekPlan assignments={assigned} onPickRoutine={open} />
          </TourTarget>
        </Section>
      ) : null}

      <ForYouBlock onOpen={open} state={forYou.state} />

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
            placeholder="Buscar rutina…"
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
              borderColor: count > 0 ? colors.borderControl : colors.border,
              backgroundColor: count > 0 ? colors.surfaceHighest : colors.surface,
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
        <ScrollView
          contentContainerStyle={{ gap: spacing.sm }}
          horizontal
          showsHorizontalScrollIndicator={false}
          testID="goal-chips"
        >
          <FilterChip
            label="Todos"
            onPress={() => setFilters({ ...filters, objetivo: null })}
            selected={!filters.objetivo}
          />
          {trainingGoals.map((goal: TrainingGoal) => (
            <FilterChip
              key={goal}
              label={GOAL_LABEL[goal]}
              onPress={() => setFilters({ ...filters, objetivo: filters.objetivo === goal ? null : goal })}
              selected={filters.objetivo === goal}
              testID={`goal-chip-${goal}`}
            />
          ))}
        </ScrollView>
      ) : null}

      {tab === 'public' ? (
        <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>
          Orden: {ORDER_LABELS[filters.orden]}
          {filters.deMiGimnasio ? ' · De mi gimnasio' : ''}
          {profileGoal && filters.objetivo === profileGoal ? ' · Tu objetivo' : ''}
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
            <Button label="Crear rutina" onPress={() => router.push('/routines/new')} variant="secondary" />
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
