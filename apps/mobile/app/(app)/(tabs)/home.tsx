import { useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { IconBadge } from '@/components/icon-badge';
import { IconButton } from '@/components/icon-button';
import { useQueries, useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { formatVolume, isStaff, overloadDelta, summariseTraining } from '@gymsheet/domain';
import { programService, membershipService, progressionService, routineService, workoutService } from '@/api/services';
import { EmptyState, ErrorState, Skeleton } from '@/components/feedback';
import { Badge, Card, Divider, ScrollScreen, ScreenHeader, Section } from '@/components/layout';
import { PressableScale } from '@/components/motion';
import { NavRow } from '@/components/list';
import { MembershipGate } from '@/components/membership-gate';
import { ProgressTrack } from '@/components/progression';
import { Text } from '@/components/text';
import { TourTarget, useScreenTour } from '@/components/tour';
import { Button } from '@/components/ui';
import { WeekDots } from '@/components/week-dots';
import { homeWeekDots } from '@/features/home/home-week';
import { MuscleSplit } from '@/features/home/muscle-split';
import { ProgressStrip } from '@/features/home/progress-strip';
import { TodayCard } from '@/features/home/today-card';
import { notificationService } from '@/features/notifications/service';
import { activeProgramsKey } from '@/features/programs/use-active-programs';
import { WORKOUT_LABEL, WORKOUT_TONE, formatDuration, formatTimeOfDay, relativeDay, shortName } from '@/lib/format';
import { useAuthStore } from '@/state/auth-store';
import { colors, iconSizes, metricColors, spacing } from '@/theme';

const LONG_DATE = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

/**
 * Inicio (rediseño 2026-10-18). Un protagonista: «Hoy» en `HeroSurface`, con
 * «Entrenar hoy» como única acción en acento. Antes, si hace falta, la franja
 * de membresía. Después UNA cifra orgullosa (entrenos de la semana, la única
 * `hero`), con la racha y la carga de apoyo; al final las sesiones y una
 * lista callada con la senda y la membresía. Los avisos van a la campana.
 */
export default function HomeScreen() {
  const principal = useAuthStore((state) => state.principal);
  const router = useRouter();
  useScreenTour('home');
  const unreadNotifications = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: notificationService.unreadCount,
    staleTime: 60_000,
  });

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
    membership.isFetching ||
    workouts.isFetching ||
    assignments.isFetching ||
    progression.isFetching ||
    programs.isFetching ||
    unreadNotifications.isFetching;
  const refresh = () => {
    void membership.refetch();
    void workouts.refetch();
    void assignments.refetch();
    void progression.refetch();
    void programs.refetch();
    void unreadNotifications.refetch();
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

  const unread = unreadNotifications.data?.count ?? 0;
  const streak = training.streakWeeks;
  const weekSummary =
    week.planned > 0
      ? `${week.done} de ${week.planned} entrenos hechos esta semana`
      : week.done === 1
        ? '1 entreno esta semana'
        : `${week.done} entrenos esta semana`;

  return (
    <ScrollScreen onRefresh={refresh} refreshing={refreshing}>
      <ScreenHeader
        action={
          <View>
            <IconButton
              icon="notifications-outline"
              label={unread ? `Centro de avisos, ${unread} nuevos` : 'Centro de avisos'}
              onPress={() => router.push('/notifications-inbox')}
              testID="home-notifications"
            />
            {unread ? (
              <View pointerEvents="none" style={{ position: 'absolute', top: -spacing.xs, right: -spacing.xs }}>
                <Badge label={unread > 99 ? '99+' : `${unread}`} tone="success" />
              </View>
            ) : null}
          </View>
        }
        subtitle={isStaff(principal?.role) ? 'El panel de staff vive en la versión web.' : LONG_DATE.format(new Date())}
        title={`Hola, ${firstName}`}
        tourKey="home"
      />

      <PressableScale
        accessibilityLabel="Explorar Directorio Fitness"
        onPress={() => router.push('/directorio')}
        style={{
          backgroundColor: '#10b981',
          borderRadius: 14,
          paddingVertical: 14,
          paddingHorizontal: 16,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          marginBottom: 12,
        }}
      >
        <Ionicons color="#000" name="storefront" size={24} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#000', fontSize: 15, fontWeight: '700' }}>Directorio & Reseñas App Store</Text>
          <Text style={{ color: '#064e3b', fontSize: 12, fontWeight: '500' }}>Gimnasios, suplementos, coaches y valoraciones</Text>
        </View>
        <Ionicons color="#000" name="arrow-forward" size={20} />
      </PressableScale>

      {/* Si el acceso no está vigente, eso es lo primero que hay que resolver,
          pero en una franja: el valor de la pantalla tiene que verse igual. */}
      {membership.data && !membershipData?.vigenteHoy ? (
        <MembershipGate onRenew={() => router.push('/membership')} projection={membership.data} variant="compact" />
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

      {/* La semana es UNA cifra orgullosa (la única `hero` de Inicio: «Hoy»
          protagoniza con palabras, no con un número). Lo demás, de apoyo. */}
      <Section title="Tu semana">
        {workouts.isPending ? (
          <Skeleton height={168} />
        ) : (
          <View style={{ gap: spacing.md }}>
            {workouts.isError ? null : sessions.length === 0 ? (
              <Text tone="secondary" variant="subhead">
                Tu primer entreno enciende el primer día. Desde ahí, cada semana cuenta.
              </Text>
            ) : (
              <View accessibilityLabel={weekSummary} accessible style={{ gap: spacing.xxs }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm }}>
                  <Text variant="hero">{`${week.done}`}</Text>
                  <Text style={{ flexShrink: 1 }} tabular tone="secondary" variant="title">
                    {week.planned > 0
                      ? `de ${week.planned} entrenos`
                      : week.done === 1
                        ? 'entreno'
                        : 'entrenos'}
                  </Text>
                </View>
                {streak > 0 ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                    <Ionicons color={metricColors.streak.ink} name="flame-outline" size={iconSizes.sm} />
                    <Text tabular tone="secondary" variant="footnote">
                      {`${streak} ${streak === 1 ? 'semana seguida' : 'semanas seguidas'}`}
                    </Text>
                  </View>
                ) : null}
              </View>
            )}
            <WeekDots days={week.days} quiet />
            {workouts.isError ? (
              <ErrorState error={workouts.error} onRetry={() => void workouts.refetch()} />
            ) : (
              <TourTarget id="home.progress">
                <ProgressStrip
                  figures={[
                    {
                      key: 'carga',
                      value: formatVolume(training.thisWeek.volumeKg),
                      label: 'Carga esta semana',
                      delta: overload,
                    },
                    { key: 'mes', value: `${training.recentSessions}`, label: 'Sesiones en 4 semanas' },
                  ]}
                />
              </TourTarget>
            )}
            {workouts.data ? (
              <TourTarget id="home.muscles">
                <MuscleSplit week={training.thisWeek} />
              </TourTarget>
            ) : null}
          </View>
        )}
      </Section>

      <Section title="Últimas sesiones">
        {workouts.isPending ? (
          <Skeleton height={140} />
        ) : workouts.isError ? null : sessions.length === 0 ? (
          <EmptyState
            icon="barbell-outline"
            message="Cada entreno queda aquí con su duración y sus ejercicios, listo para repetirlo o superarlo."
            title="Tu historial empieza hoy"
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
                    // «Finalizada» en cada fila es ruido: solo se marca lo que no lo está.
                    meta={
                      session.estado === 'FINALIZADA' ? undefined : (
                        <Badge label={WORKOUT_LABEL[session.estado]} tone={WORKOUT_TONE[session.estado]} />
                      )
                    }
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
            icon="arrow-forward"
            iconPosition="end"
            label="Ver todos mis entrenos"
            onPress={() => router.push('/workouts')}
            size="sm"
            style={{ alignSelf: 'flex-start' }}
            variant="ghost"
          />
        ) : null}
      </Section>

      {/* La senda y la membresía vigente: una sola lista callada al final. */}
      {progression.data?.level || membershipData?.vigenteHoy ? (
        <Card list>
          {progression.data?.level ? (
            <PressableScale
              accessibilityLabel={`Tu rango es ${progression.data.level.name}, ${progression.data.points} puntos. Ver la senda completa.`}
              onPress={() => router.push('/trayectoria')}
              style={{ gap: spacing.xs, paddingVertical: spacing.smd }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.smd }}>
                <IconBadge
                  icon={(progression.data.level.icon ?? 'ribbon-outline') as keyof typeof Ionicons.glyphMap}
                  size={36}
                  tone="record"
                />
                <View style={{ flex: 1, gap: spacing.xxs }}>
                  <Text numberOfLines={1} variant="headline">
                    {progression.data.level.name}
                  </Text>
                  <Text tabular tone="muted" variant="footnote">
                    {progression.data.nextLevel && progression.data.pointsToNextLevel !== null
                      ? `${progression.data.points.toLocaleString('es-ES')} pts · faltan ${progression.data.pointsToNextLevel.toLocaleString('es-ES')} para ${progression.data.nextLevel.name}`
                      : `${progression.data.points.toLocaleString('es-ES')} pts · senda completa`}
                  </Text>
                </View>
              </View>
              <ProgressTrack color={colors.textSecondary} ratio={progression.data.levelProgress} />
            </PressableScale>
          ) : null}
          {progression.data?.level && membershipData?.vigenteHoy ? <Divider /> : null}
          {membershipData?.vigenteHoy ? (
            <NavRow
              leading={<IconBadge icon="card-outline" size={36} tone="record" />}
              onPress={() => router.push('/membership')}
              subtitle={`${membershipData.diasRestantes} ${membershipData.diasRestantes === 1 ? 'día restante' : 'días restantes'}`}
              title={membershipData.plan?.nombre ?? 'Tu membresía'}
            />
          ) : null}
        </Card>
      ) : null}
    </ScrollScreen>
  );
}
