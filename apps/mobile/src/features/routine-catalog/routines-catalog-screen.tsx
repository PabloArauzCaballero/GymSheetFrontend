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
import { usePullRefresh } from '@/hooks/use-pull-refresh';
import { EmptyState, ErrorState } from '@/components/feedback';
import { FilterChip } from '@/components/filter-chip';
import { ScrollScreen, ScreenHeader, Section } from '@/components/layout';
import { BadgePop, EnterUp, PressableScale } from '@/components/motion';
import { Text as AppText } from '@/components/text';
import { TourTarget, useScreenTour } from '@/components/tour';
import { QuickActions } from '@/features/routine-catalog/quick-actions';
import { routes } from '@/lib/routes';
import { Button } from '@/components/ui';
import { SEARCH_HEIGHT, SearchField } from '@/features/routine-catalog/search-field';
import { WeekPlan } from '@/components/week-plan';
import { useActivePrograms } from '@/features/programs/use-active-programs';
import { CardioProgramCard } from '@/features/cardio/cardio-program-card';
import { StrengthProgramCard } from '@/features/programs/program-card';
import { CatalogFiltersSheet } from '@/features/routine-catalog/catalog-filters';
import { CatalogTabBar, MineChips, ResultCount } from '@/features/routine-catalog/catalog-tab-bar';
import { InvitationCard } from '@/features/routine-catalog/invitation-card';
import { RoutineCardSkeleton, RoutineCardView } from '@/features/routine-catalog/routine-card';
import { useRoutineCatalog } from '@/features/routine-catalog/use-routine-catalog';
import { GOAL_LABEL } from '@/lib/format';
import { colors, fontSizes, gutter, iconSizes, radii, spacing } from '@/theme';

const EMPTY_COPY: Record<string, { title: string; message: string }> = {
  public: {
    title: 'Aún no hay rutinas públicas con estos filtros',
    message: 'Prueba con otro objetivo o quita algún filtro.',
  },
  official: {
    title: 'Aún no hay rutinas destacadas',
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
  const pull = usePullRefresh(() =>
    Promise.all([
      catalog.refetch(),
      assignments.refetch(),
      invitations.refetch(),
      queryClient.invalidateQueries({ queryKey: ['programs'] }),
    ]),
  );
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
      onRefresh={pull.onRefresh}
      refreshing={pull.refreshing}
    >
      <ScreenHeader title="Rutinas" tourKey="routines" />
      {/* Cabecera: accesos en casillas iguales. */}
      <TourTarget id="routines.create">
        <QuickActions
          actions={[
            {
              key: 'create',
              label: 'Crear rutina',
              icon: 'add',
              onPress: () => router.push('/routines/new'),
              testID: 'create-routine',
            },
            {
              key: 'exercises',
              label: 'Explorar ejercicios',
              icon: 'search-outline',
              onPress: () => router.push(routes.exercises()),
            },
            ...(programs.data && !programs.data.cardio
              ? [
                  {
                    key: 'cardio',
                    label: 'Plan de cardio',
                    icon: 'pulse-outline' as const,
                    onPress: () => router.push('/routines/cardio/new'),
                  },
                ]
              : []),
          ]}
        />
      </TourTarget>

      {programs.data?.fuerza ? <StrengthProgramCard program={programs.data.fuerza} /> : null}
      {programs.data?.cardio ? (
        <CardioProgramCard program={programs.data.cardio} strengthToday={strengthToday} />
      ) : null}

      {assigned.length > 0 ? (
        <Section index={0} title="Tu semana">
          <TourTarget id="routines.week">
            <WeekPlan assignments={assigned} onPickRoutine={open} />
          </TourTarget>
        </Section>
      ) : null}

      {/* Explorar: pestañas, búsqueda y objetivo juntos, a 16 entre sí; antes
          iban a 32 como si fueran secciones distintas y la pantalla se partía. */}
      <View style={{ gap: spacing.md }}>
        <AppText accessibilityRole="header" variant="title">
          Explorar
        </AppText>
        <CatalogTabBar onChange={setTab} value={tab} />
        {tab === 'mine' ? (
          <MineChips onChange={setChip} pendingInvitations={pending} value={chip} />
        ) : null}

        <View
          style={{
            flexDirection: 'row',
            gap: spacing.sm,
            alignItems: 'center',
          }}
        >
          <SearchField onChangeText={setSearch} value={search} />
          {tab === 'public' ? (
            <PressableScale
              accessibilityLabel={count > 0 ? `Filtros, ${count} aplicados` : 'Filtros'}
              haptic="selection"
              onPress={() => setSheet(true)}
              scaleTo={0.94}
              style={{
                width: SEARCH_HEIGHT,
                height: SEARCH_HEIGHT,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: radii.lg,
                borderCurve: 'continuous',
                backgroundColor: count > 0 ? colors.text : colors.surfaceHigh,
              }}
              testID="open-filters"
            >
              <Ionicons
                color={count > 0 ? colors.background : colors.text}
                name="options-outline"
                size={iconSizes.md}
              />
              {count > 0 ? (
                <BadgePop
                  style={{
                    position: 'absolute',
                    top: -spacing.xs,
                    right: -spacing.xs,
                    minWidth: 20,
                    height: 20,
                    paddingHorizontal: spacing.xs,
                    borderRadius: radii.full,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: colors.volt,
                  }}
                  value={count}
                >
                  <AppText strong tabular tone="onAccent" variant="caption">
                    {count}
                  </AppText>
                </BadgePop>
              ) : null}
            </PressableScale>
          ) : null}
        </View>

        {tab === 'public' ? (
          <ScrollView
            // A sangre: los chips corren hasta el borde de la pantalla y el
            // primero arranca alineado con el margen.
            contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: gutter }}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginHorizontal: -gutter }}
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
                onPress={() =>
                  setFilters({
                    ...filters,
                    objetivo: filters.objetivo === goal ? null : goal,
                  })
                }
                selected={filters.objetivo === goal}
                testID={`goal-chip-${goal}`}
              />
            ))}
          </ScrollView>
        ) : null}
      </View>

      <CatalogFiltersSheet
        onChange={setFilters}
        onClose={() => setSheet(false)}
        value={filters}
        visible={sheet}
      />

      {catalog.isPending ? (
        <View style={{ gap: spacing.xl }}>
          <RoutineCardSkeleton />
          <RoutineCardSkeleton />
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
        <View style={{ gap: spacing.xl }}>
          {catalog.isError ? (
            <Text
              accessibilityRole="alert"
              style={{ color: colors.warning, fontSize: fontSizes.sm }}
              testID="offline-notice"
            >
              Sin conexión. Mostramos lo último que cargó.
            </Text>
          ) : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
            <ResultCount hasMore={catalog.hasNextPage} shown={cards.length} />
            {tab === 'public' ? (
              <Text numberOfLines={1} style={{ flexShrink: 1, color: colors.textMuted, fontSize: fontSizes.sm }}>
                Orden: {ORDER_LABELS[filters.orden]}
                {filters.deMiGimnasio ? ' · De mi gimnasio' : ''}
                {profileGoal && filters.objetivo === profileGoal ? ' · Tu objetivo' : ''}
              </Text>
            ) : null}
          </View>
          {pendingCards.map((card) => (
            <InvitationCard card={card} key={card.id} onAccepted={open} />
          ))}
          {regularCards.map((card, index) => (
            // Entrada en cascada, una vez y solo las primeras: guía el ojo
            // hacia abajo cuando llega la lista; las de «Ver más» ya no esperan.
            <EnterUp index={index} key={card.id}>
              <RoutineCardView card={card} />
            </EnterUp>
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
