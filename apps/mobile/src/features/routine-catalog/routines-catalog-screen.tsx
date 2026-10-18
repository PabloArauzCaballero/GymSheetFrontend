import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cardioModalityLabels } from '@gymsheet/hooks';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import {
  activeFilterCount,
  emptyCatalogFilters,
  hasActiveFilters,
  initialCatalogFilters,
  isPendingInvitation,
  ORDER_LABELS,
  type CatalogFilterState,
  type CatalogTab,
} from '@gymsheet/hooks';
import { trainingGoals, type TrainingGoal } from '@gymsheet/types';
import { ApiError } from '@gymsheet/api-client';
import { profileService, programService, routineService, routineSharingService } from '@/api/services';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { usePullRefresh } from '@/hooks/use-pull-refresh';
import { EmptyState, ErrorState } from '@/components/feedback';
import { FilterChip } from '@/components/filter-chip';
import { ScrollScreen, ScreenHeader, Section } from '@/components/layout';
import { BadgePop, EnterUp, PressableScale } from '@/components/motion';
import { Text as AppText } from '@/components/text';
import { TourTarget, useScreenTour } from '@/components/tour';
import { useTourStore } from '@/state/tour-store';
import { routes } from '@/lib/routes';
import { Button } from '@/components/ui';
import { SEARCH_HEIGHT, SearchField } from '@/features/routine-catalog/search-field';
import { WeekDaySheet, WeekPlan, type WeekSession } from '@/components/week-plan';
import { useActivePrograms } from '@/features/programs/use-active-programs';
import { ActiveProgramsCompact } from '@/features/programs/active-programs-compact';
import { MoreButton, MoreSheet, type MoreAction } from '@/features/routine-detail/more-sheet';
import { CatalogFiltersSheet } from '@/features/routine-catalog/catalog-filters';
import { CatalogTabBar, ResultCount } from '@/features/routine-catalog/catalog-tab-bar';
import { InvitationCard } from '@/features/routine-catalog/invitation-card';
import { RoutineCardSkeleton, RoutineCardView } from '@/features/routine-catalog/routine-card';
import { useRoutineCatalog } from '@/features/routine-catalog/use-routine-catalog';
import { GOAL_LABEL } from '@/lib/format';
import { colors, fontSizes, gutter, iconSizes, radii, spacing } from '@/theme';

/** Una sesión de «Tu semana» con su destino: la hoja del día la abre al elegirla. */
type PickableSession = WeekSession & { open: () => void };

const EMPTY_COPY: Record<string, { title: string; message: string }> = {
  all: {
    title: 'Aún no hay rutinas con estos filtros',
    message: 'Prueba con otro objetivo, quita algún filtro o crea la tuya.',
  },
  shared: {
    title: 'Aún no hay rutinas compartidas',
    message: 'Aquí verás las rutinas del equipo REPP y las que te compartan.',
  },
};

/** Pestaña Rutinas con la bandera `routinesV2` (RF-01). */
export function RoutinesCatalogScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<CatalogTab>('all');
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [pickedDay, setPickedDay] = useState<number | null>(null);
  const openTour = useTourStore((state) => state.open);
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

  const own = useRoutineCatalog(tab, applied);
  // «Compartidas» reúne las del equipo REPP (primero, con su sello) y las que
  // te enviaron: REPP dejó de ser pestaña propia (2026-10-15).
  const official = useRoutineCatalog('official', applied, { enabled: tab === 'shared' });
  const withOfficial = tab === 'shared';
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
      own.refetch(),
      withOfficial ? official.refetch() : Promise.resolve(),
      assignments.refetch(),
      invitations.refetch(),
      queryClient.invalidateQueries({ queryKey: ['programs'] }),
    ]),
  );
  const strengthProgram = programs.data?.fuerza ?? null;
  const cardioProgram = programs.data?.cardio ?? null;
  const strengthRoutine = useQuery({
    queryKey: ['routine', strengthProgram?.rutinaId],
    queryFn: () => routineService.get(strengthProgram?.rutinaId ?? ''),
    enabled: Boolean(strengthProgram?.rutinaId),
  });
  const cardioPlans = useQuery({
    queryKey: ['cardio-plans'],
    queryFn: () => programService.cardioPlans(),
    enabled: Boolean(cardioProgram),
  });
  const assigned = assignments.data?.filter((item) => item.estado === 'ACTIVE') ?? [];
  const pending = invitations.data?.length ?? 0;
  const open = (id: string) => router.push({ pathname: '/routines/[id]', params: { id } });

  // «Tu semana» junta lo que convive: el día de pesas, el cardio y las
  // asignadas, un punto por sesión. Los días de la rutina van 1 (lunes) a 7
  // (domingo); la tira usa `getDay()`, de ahí el `% 7`.
  const weekSessions: PickableSession[] = [
    ...(strengthProgram && strengthRoutine.data
      ? strengthRoutine.data.dias.flatMap((day) =>
          day.diaSemana === null
            ? []
            : [
                {
                  key: `strength-${day.id}`,
                  day: day.diaSemana % 7,
                  kind: 'strength' as const,
                  title: strengthRoutine.data.nombre,
                  detail: day.nombre,
                  open: () =>
                    router.push({
                      pathname: '/routines/[id]/dia/[diaId]',
                      params: { id: strengthRoutine.data.id, diaId: day.id },
                    }),
                },
              ],
        )
      : []),
    ...(() => {
      const plan = cardioPlans.data?.find((candidate) => candidate.id === cardioProgram?.cardioPlanId);
      return plan
        ? plan.diasSemana.map((day) => ({
            key: `cardio-${plan.id}-${day}`,
            day: day % 7,
            kind: 'cardio' as const,
            title: `Cardio · ${cardioModalityLabels[plan.modalidad]}`,
            detail: `${plan.minutosObjetivo} min`,
            open: () => router.push({ pathname: '/routines/activa', params: { tipo: 'cardio' } }),
          }))
        : [];
    })(),
    ...assigned
      // La rutina activada también puede venir asignada: no se pinta dos veces.
      .filter((item) => item.rutina && item.rutina.id !== strengthProgram?.rutinaId)
      .flatMap((item) =>
        item.diasSemana.map((day) => ({
          key: `assigned-${item.id}-${day}`,
          day,
          kind: 'assigned' as const,
          title: item.rutina?.nombre.split('—').pop()?.trim() ?? 'Rutina',
          open: () => open(item.rutina?.id ?? ''),
        })),
      ),
  ];

  // Lo poco frecuente de la cabecera va al menú ⋯ (2026-10-18): las cuatro
  // fichas y el «?» ocupaban la mitad de arriba, que ahora es de la semana.
  const menu: MoreAction[] = [
    { key: 'create', label: 'Crear rutina', icon: 'add-circle-outline', onPress: () => router.push('/routines/new') },
    { key: 'exercises', label: 'Explorar ejercicios', icon: 'search-outline', onPress: () => router.push(routes.exercises()) },
    ...(programs.data && !programs.data.cardio
      ? [{ key: 'cardio', label: 'Plan de cardio', icon: 'pulse-outline' as const, onPress: () => router.push('/routines/cardio/new') }]
      : []),
    { key: 'music', label: 'Música', icon: 'musical-notes-outline', onPress: () => router.push('/routines/musica') },
    { key: 'guide', label: 'Ver la guía de esta pantalla', icon: 'help-circle-outline', afterClose: true, onPress: () => openTour('routines') },
  ];
  const officialCards = withOfficial ? (official.data?.pages.flatMap((page) => page.items) ?? []) : [];
  const ownCards = own.data?.pages.flatMap((page) => page.items) ?? [];
  const seen = new Set(officialCards.map((card) => card.id));
  const cards = [...officialCards, ...ownCards.filter((card) => !seen.has(card.id))];
  // Una sola vista de las dos consultas: se pagina primero REPP y luego lo tuyo.
  const catalog = {
    data: own.data || (withOfficial && official.data) ? true : undefined,
    isPending: own.isPending || (withOfficial && official.isPending),
    isError: own.isError || (withOfficial && official.isError),
    error: own.error ?? (withOfficial ? official.error : null),
    hasNextPage: own.hasNextPage || (withOfficial && official.hasNextPage),
    isFetchingNextPage: own.isFetchingNextPage || official.isFetchingNextPage,
    refetch: () => Promise.all([own.refetch(), withOfficial ? official.refetch() : null]),
    fetchNextPage: () =>
      withOfficial && official.hasNextPage ? official.fetchNextPage() : own.fetchNextPage(),
  };
  const pendingCards = cards.filter(isPendingInvitation);
  const regularCards = cards.filter((card) => !isPendingInvitation(card));
  const count = activeFilterCount(filters);

  return (
    <ScrollScreen
      onRefresh={pull.onRefresh}
      refreshing={pull.refreshing}
    >
      <ScreenHeader
        action={
          <TourTarget id="routines.create">
            <MoreButton
              accessibilityLabel="Más: crear rutina, ejercicios, cardio, música y guía"
              onPress={() => setMenuOpen(true)}
              testID="routines-more"
            />
          </TourTarget>
        }
        title="Rutinas"
      />
      <MoreSheet actions={menu} onClose={() => setMenuOpen(false)} title="Rutinas" visible={menuOpen} />

      {weekSessions.length > 0 ? (
        <Section index={0} title="Tu semana">
          <TourTarget id="routines.week">
            <WeekPlan onPickDay={setPickedDay} sessions={weekSessions} />
          </TourTarget>
        </Section>
      ) : null}
      <WeekDaySheet
        day={pickedDay}
        onClose={() => setPickedDay(null)}
        onPick={(session) => session.open()}
        sessions={weekSessions}
      />

      <ActiveProgramsCompact cardio={cardioProgram} strength={strengthProgram} />

      {/* Explorar: pestañas, búsqueda y objetivo juntos, a 16 entre sí; antes
          iban a 32 como si fueran secciones distintas y la pantalla se partía. */}
      <View style={{ gap: spacing.md }}>
        <AppText accessibilityRole="header" variant="title">
          Explorar
        </AppText>
        <CatalogTabBar onChange={setTab} pendingInvitations={pending} value={tab} />

        <View
          style={{
            flexDirection: 'row',
            gap: spacing.sm,
            alignItems: 'center',
          }}
        >
          <SearchField onChangeText={setSearch} value={search} />
          {tab === 'all' ? (
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

        {tab === 'all' ? (
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
          message={EMPTY_COPY[tab]?.message ?? ''}
          title={EMPTY_COPY[tab]?.title ?? 'Sin rutinas'}
        >
          {tab === 'all' && hasActiveFilters(applied) ? (
            <Button
              label="Limpiar filtros"
              onPress={() => {
                setFilters(emptyCatalogFilters);
                setSearch('');
              }}
              variant="ghost"
            />
          ) : null}
          {tab === 'all' && !hasActiveFilters(applied) ? (
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
            {tab === 'all' ? (
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
