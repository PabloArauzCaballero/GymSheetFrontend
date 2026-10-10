import { useQueries, useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { formatVolume, isStaff, overloadDelta, summariseTraining } from '@gymsheet/domain';
import { programService, membershipService, progressionService, routineService, workoutService } from '@/api/services';
import { EmptyState, ErrorState, Skeleton } from '@/components/feedback';
import { Badge, Card, Divider, ScrollScreen, ScreenHeader, Section, StatTile } from '@/components/layout';
import { NavRow } from '@/components/list';
import { MembershipGate } from '@/components/membership-gate';
import { ProgressTrack } from '@/components/progression';
import { Text } from '@/components/text';
import { TourTarget, useScreenTour } from '@/components/tour';
import { Button } from '@/components/ui';
import { WeekDots } from '@/components/week-dots';
import { homeWeekDots } from '@/features/home/home-week';
import { MuscleSplit } from '@/features/home/muscle-split';
import { TodayCard } from '@/features/home/today-card';
import { activeProgramsKey } from '@/features/programs/use-active-programs';
import { WORKOUT_LABEL, WORKOUT_TONE, formatDuration, formatTimeOfDay, relativeDay, shortName } from '@/lib/format';
import { useAuthStore } from '@/state/auth-store';
import { colors, spacing } from '@/theme';

const LONG_DATE = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

/**
 * Inicio (C8.3.5), alrededor de «Hoy»: primero lo que toca entrenar con su
 * única acción en acento, después la semana en `WeekDots` y al final el
 * progreso (una sola fila de cifras), la senda y las últimas sesiones.
 */
export default function HomeScreen() {
  const principal = useAuthStore((state) => state.principal);
  const router = useRouter();
  useScreenTour('home');

  const [membership, workouts, assignments, progression, programs] = useQueries({
    queries: [
      { queryKey: ['membership', 'me'], queryFn: () => membershipService.getMine() },
      // 40: la lista enseña tres, pero la semana y la comparación con la
      // anterior necesitan el historial del periodo. Una petición sirve a todo.
      { queryKey: ['workouts', 'recent'], queryFn: () => workoutService.list(40) },
      { queryKey: ['routines', 'assignments', 'me'], queryFn: () => routineService.myAssignments() },
      { queryKey: ['progression', 'me'], queryFn: () => progressionService.get() },
      { queryKey: activeProgramsKey, queryFn: () => programService.active(), staleTime: 30_000 },
    ],
  });
  const strength = programs.data?.fuerza ?? null;
  const routine = useQuery({
    queryKey: ['routine', strength?.rutinaId],
    queryFn: () => routineService.get(strength?.rutinaId ?? ''),
    enabled: Boolean(strength?.rutinaId),
  });

  const refreshing =
    membership.isFetching || workouts.isFetching || assignments.isFetching || progression.isFetching || programs.isFetching;
  const refresh = () => {
    void membership.refetch();
    void workouts.refetch();
    void assignments.refetch();
    void progression.refetch();
    void programs.refetch();
    if (strength?.rutinaId) void routine.refetch();
  };

  const firstName = shortName(principal?.nombreCompleto, principal?.email);
  const sessions = workouts.data?.items ?? [];
  const openSession = sessions.find((session) => session.estado === 'EN_PROGRESO');
  const activeAssignment = assignments.data?.find((item) => item.estado === 'ACTIVE');
  const training = summariseTraining(sessions);
  const overload = overloadDelta(training);
  const week = homeWeekDots(sessions, routine.data);
  const todayLoading = programs.isPending || (Boolean(strength?.rutinaId) && routine.isPending) || assignments.isPending;
  const todayError = programs.error ?? routine.error ?? null;
  const membershipData = membership.data?.membership;

  return (
    <ScrollScreen onRefresh={refresh} refreshing={refreshing}>
      <ScreenHeader
        subtitle={isStaff(principal?.role) ? 'El panel de staff vive en la versión web.' : LONG_DATE.format(new Date())}
        title={`Hola, ${firstName}`}
        tourKey="home"
      />

      {/* Si el acceso no está vigente, eso es lo primero que hay que resolver. */}
      {membership.data && !membershipData?.vigenteHoy ? (
        <MembershipGate onRenew={() => router.push('/membership')} projection={membership.data} />
      ) : null}

      <TodayCard
        assignment={activeAssignment}
        error={todayError}
        loading={todayLoading}
        onRetry={refresh}
        openSession={openSession}
        program={strength}
        routine={routine.data}
      />

      <Section title="Tu semana">
        {workouts.isPending ? (
          <Skeleton height={64} />
        ) : (
          <View style={{ gap: spacing.smd }}>
            <WeekDots days={week.days} />
            <Text tabular tone="muted" variant="subhead">
              {week.planned > 0
                ? `${week.done} de ${week.planned} entrenos hechos esta semana`
                : week.done === 1
                  ? '1 entreno esta semana'
                  : `${week.done} entrenos esta semana`}
            </Text>
          </View>
        )}
      </Section>

      <Section title="Tu progreso">
        {workouts.isPending ? (
          <Skeleton height={120} />
        ) : workouts.isError ? (
          <ErrorState error={workouts.error} onRetry={() => void workouts.refetch()} />
        ) : (
          <TourTarget id="home.progress">
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <StatTile delta={overload} label="Carga esta semana" value={formatVolume(training.thisWeek.volumeKg)} />
              <StatTile label="Semanas seguidas" value={`${training.streakWeeks}`} />
              <StatTile label="En 4 semanas" value={`${training.recentSessions}`} />
            </View>
          </TourTarget>
        )}

        {workouts.data ? (
          <TourTarget id="home.muscles">
            <MuscleSplit week={training.thisWeek} />
          </TourTarget>
        ) : null}

        {progression.data?.level ? (
          <Card
            accessibilityLabel={`Tu rango es ${progression.data.level.name}, ${progression.data.points} puntos. Ver la senda completa.`}
            onPress={() => router.push('/trayectoria')}
          >
            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.sm }}>
              <Text variant="headline">{progression.data.level.name}</Text>
              <Text tabular tone="secondary" variant="subhead">
                {`${progression.data.points.toLocaleString('es-ES')} pts`}
              </Text>
            </View>
            <ProgressTrack color={colors.textSecondary} ratio={progression.data.levelProgress} />
            <Text tone="muted" variant="footnote">
              {progression.data.nextLevel && progression.data.pointsToNextLevel !== null
                ? `Faltan ${progression.data.pointsToNextLevel.toLocaleString('es-ES')} para ${progression.data.nextLevel.name}`
                : 'Senda completa'}
            </Text>
          </Card>
        ) : null}
      </Section>

      <Section title="Últimas sesiones">
        {workouts.isPending ? (
          <Skeleton height={140} />
        ) : workouts.isError ? null : sessions.length === 0 ? (
          <EmptyState
            icon="barbell-outline"
            message="Cuando termines tu primer entreno, lo verás aquí con su duración y sus ejercicios."
            title="Todavía sin sesiones"
          />
        ) : (
          <Card list>
            {sessions.slice(0, 3).map((session, index) => {
              const duration = formatDuration(session.fechaInicio, session.fechaFin);
              const startTime = formatTimeOfDay(session.fechaInicio);
              const count = session.ejercicios.length;
              return (
                <View key={session.id}>
                  {index > 0 ? <Divider /> : null}
                  <NavRow
                    meta={<Badge label={WORKOUT_LABEL[session.estado]} tone={WORKOUT_TONE[session.estado]} />}
                    onPress={() => router.push({ pathname: '/workouts/[id]', params: { id: session.id } })}
                    subtitle={`${count} ${count === 1 ? 'ejercicio' : 'ejercicios'}${duration ? ` · ${duration}` : ''}`}
                    title={`${relativeDay(session.fechaInicio)}${startTime ? ` · ${startTime}` : ''}`}
                  />
                </View>
              );
            })}
          </Card>
        )}
        {sessions.length > 3 ? (
          <Button
            label="Ver todos mis entrenos"
            onPress={() => router.push('/workouts')}
            size="sm"
            style={{ alignSelf: 'flex-start' }}
            variant="ghost"
          />
        ) : null}
      </Section>

      {membershipData?.vigenteHoy ? (
        <Card list>
          <NavRow
            onPress={() => router.push('/membership')}
            subtitle={`${membershipData.diasRestantes} ${membershipData.diasRestantes === 1 ? 'día restante' : 'días restantes'}`}
            title={membershipData.plan?.nombre ?? 'Tu membresía'}
          />
        </Card>
      ) : null}
    </ScrollScreen>
  );
}
