'use client';

import { formatVolume, overloadDelta, summariseTraining, relativeDay, formatTimeOfDay, sessionDuration } from '@gymsheet/domain';
import { homeWeekDots } from '@gymsheet/hooks';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Award, Bell, CreditCard, Dumbbell, Flame, Store } from 'lucide-react';
import Link from 'next/link';
import { useSyncExternalStore } from 'react';
import { TodayCard } from '@/features/home/components/today-card';
import { RepiCard } from '@/features/nudge/components/repi-card';
import { MuscleSplit } from '@/features/home/components/muscle-split';
import { ProgressStrip } from '@/features/home/components/progress-strip';
import { MembershipGate } from '@/features/membership/components/membership-gate';
import { membershipService } from '@/features/membership/services/membership-service';
import { notificationService } from '@/features/notifications/services/notification-service';
import { progressionService } from '@/features/progression/services/progression-service';
import { programKeys } from '@/features/routines-v2/keys';
import { programService } from '@/features/routines-v2/services';
import { trainingService } from '@/features/training/services/training-service';
import { workoutService } from '@/features/workouts/services/workout-service';
import { queryKeys } from '@/shared/api/query-keys';
import { EmptyState } from '@/shared/components/feedback/empty-state';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { Skeleton } from '@/shared/components/feedback/skeleton';
import { PageHeader } from '@/shared/components/layout/page-header';
import { IconBadge } from '@/shared/components/mobile/icon-badge';
import { Divider, ListCard, NavRow } from '@/shared/components/mobile/nav-row';
import { Section } from '@/shared/components/mobile/section';
import { WeekDots } from '@/shared/components/mobile/week-dots';
import { Badge } from '@/shared/components/ui/badge';
import { ButtonLink } from '@/shared/components/ui/button';
import { accentHues, metricInk } from '@/shared/theme/metric-colors';

/** Misma fecha que Inicio en el móvil: «domingo, 8 de noviembre». */
const LONG_DATE = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
const subscribeNever = () => () => {};

const WORKOUT_BADGE = {
  EN_PROGRESO: { label: 'En progreso', tone: 'info' },
  CANCELADA: { label: 'Cancelada', tone: 'danger' },
} as const;

/**
 * Inicio, la misma pantalla que `apps/mobile/app/(app)/(tabs)/home.tsx`.
 *
 * Un protagonista: «Hoy» en `HeroSurface`, con su única acción en acento.
 * Antes, si hace falta, la franja de membresía. Después UNA cifra orgullosa
 * (entrenos de la semana), con la racha y la carga de apoyo; al final las
 * sesiones y una lista callada con la senda y la membresía. Los avisos van a
 * la campana de la cabecera.
 *
 * Repi (la mascota) habla aquí con el mismo motor que el widget del móvil; lo
 * que la web no tiene son los widgets y los avisos locales del teléfono.
 */
export function DashboardClient({ firstName }: Readonly<{ firstName?: string }> = {}) {
  // La fecha es la del reloj de quien mira, no la del servidor.
  const today = useSyncExternalStore(subscribeNever, () => LONG_DATE.format(new Date()), () => undefined);

  const unreadQuery = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: notificationService.unreadCount,
    staleTime: 60_000,
  });
  const membership = useQuery({ queryKey: queryKeys.membership, queryFn: membershipService.getMine, retry: false });
  const workouts = useQuery({ queryKey: ['workouts', 'recent'], queryFn: () => workoutService.list(1, 40) });
  const assignments = useQuery({ queryKey: ['routines', 'assignments', 'me'], queryFn: trainingService.myAssignments });
  const progression = useQuery({ queryKey: ['progression', 'me'], queryFn: progressionService.get, retry: false });
  const programs = useQuery({ queryKey: programKeys.active, queryFn: programService.active, staleTime: 30_000 });
  const strength = programs.data?.fuerza ?? null;
  const routine = useQuery({
    queryKey: ['routine', strength?.rutinaId],
    queryFn: () => trainingService.get(strength?.rutinaId ?? ''),
    enabled: Boolean(strength?.rutinaId),
  });

  const sessions = workouts.data?.items ?? [];
  // «En curso» es el entreno de hoy: uno abierto ayer ya no es el de ahora (misma regla que la barra del móvil).
  const openSession = sessions.find(
    (session) =>
      session.estado === 'EN_PROGRESO' && new Date(session.fechaInicio).toDateString() === new Date().toDateString(),
  );
  const activeAssignment = assignments.data?.find((item) => item.estado === 'ACTIVE');
  const training = summariseTraining(sessions);
  const overload = overloadDelta(training);
  const week = homeWeekDots(sessions, routine.data);
  const todayLoading =
    programs.isPending || (Boolean(strength?.rutinaId) && routine.isPending) || assignments.isPending;
  const todayError = programs.error ?? routine.error ?? null;
  const membershipData = membership.data?.membership;
  const unread = unreadQuery.data?.count ?? 0;
  const streak = training.streakWeeks;
  const level = progression.data?.level;

  return (
    <div className="mx-auto grid w-full max-w-[560px] gap-8 lg:max-w-[1040px]">
      <PageHeader
        titleAction={
          <Link
            aria-label={unread ? `Centro de avisos, ${unread} nuevos` : 'Centro de avisos'}
            className="relative grid size-11 place-items-center rounded-full bg-[var(--surface-high)] text-[var(--text)] transition-colors duration-[var(--dur-2)] hover:bg-[var(--surface-highest)]"
            href="/notifications"
          >
            <Bell aria-hidden className="size-5" />
            {unread ? (
              <span className="absolute -right-1 -top-1">
                <Badge tone="success">{unread > 99 ? '99+' : unread}</Badge>
              </span>
            ) : null}
          </Link>
        }
        description={today}
        title={firstName ? `Hola, ${firstName}` : 'Hola'}
        tutorialId="page:dashboard"
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
        <div className="grid gap-3">
          {/* La franja del directorio, como en el móvil. */}
          <Link
            className="tap flex items-center gap-3 rounded-[14px] px-4 py-3.5 transition-[filter] duration-[var(--dur-2)] hover:brightness-105"
            href="/directorio"
            style={{ background: accentHues.emerald, color: accentHues.ink }}
          >
            <Store aria-hidden className="size-6 shrink-0" />
            <span className="grid min-w-0 flex-1">
              <span className="text-[15px] font-bold">Directorio y reseñas</span>
              <span className="text-xs font-medium" style={{ color: accentHues.emeraldDeep }}>
                Gimnasios, suplementos, coaches y valoraciones
              </span>
            </span>
            <ArrowRight aria-hidden className="size-5 shrink-0" />
          </Link>

          {/* Si el acceso no está vigente, eso es lo primero que hay que resolver,
              pero en una franja: el valor de la pantalla tiene que verse igual. */}
          {membership.data && !membershipData?.vigenteHoy ? (
            <MembershipGate projection={membership.data} variant="compact" />
          ) : null}

          <RepiCard />

          <span data-tutorial-id="dashboard:start-workout">
            <TodayCard
              assignment={activeAssignment}
              error={todayError}
              loading={todayLoading}
              onRetry={() => {
                void programs.refetch();
                void routine.refetch();
                void assignments.refetch();
              }}
              openSession={openSession}
              program={strength}
              routine={routine.data}
            />
          </span>
        </div>

        <div className="grid gap-8">
          {/* La semana es UNA cifra orgullosa; lo demás, de apoyo. */}
          <Section title="Tu semana">
            {workouts.isPending ? (
              <Skeleton className="h-42 rounded-[var(--radius-xl)]" />
            ) : (
              <div className="grid gap-4">
                {workouts.isError ? null : sessions.length === 0 ? (
                  <p className="t-subhead text-[var(--text-muted)]">
                    Tu primer entreno enciende el primer día. Desde ahí, cada semana cuenta.
                  </p>
                ) : (
                  <div className="grid gap-0.5">
                    <p className="flex items-baseline gap-2">
                      <span className="t-hero">{week.done}</span>
                      <span className="title-text tabular-nums text-[var(--text-muted)]">
                        {week.planned > 0 ? `de ${week.planned} entrenos` : week.done === 1 ? 'entreno' : 'entrenos'}
                      </span>
                    </p>
                    {streak > 0 ? (
                      <p className="t-footnote flex items-center gap-1 tabular-nums text-[var(--text-muted)]">
                        <Flame aria-hidden className="size-4" style={{ color: metricInk.streak }} />
                        {`${streak} ${streak === 1 ? 'semana seguida' : 'semanas seguidas'}`}
                      </p>
                    ) : null}
                  </div>
                )}
                <WeekDots days={week.days} quiet />
                {workouts.isError ? (
                  <ErrorPanel message={workouts.error.message} onRetry={() => void workouts.refetch()} />
                ) : (
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
                )}
                {workouts.data ? <MuscleSplit week={training.thisWeek} /> : null}
              </div>
            )}
          </Section>

          <Section title="Últimas sesiones">
            {workouts.isPending ? (
              <Skeleton className="h-36 rounded-[var(--radius-xl)]" />
            ) : workouts.isError ? null : sessions.length === 0 ? (
              <EmptyState
                description="Cada entreno queda aquí con su duración y sus ejercicios, listo para repetirlo o superarlo."
                icon={<Dumbbell />}
                level={3}
                title="Tu historial empieza hoy"
              />
            ) : (
              <ListCard>
                {sessions.slice(0, 3).map((session, index) => {
                  const duration = sessionDuration(session.fechaInicio, session.fechaFin);
                  const startTime = formatTimeOfDay(session.fechaInicio);
                  const count = session.ejercicios.length;
                  const badge = session.estado === 'FINALIZADA' ? null : WORKOUT_BADGE[session.estado];
                  return (
                    <div key={session.id}>
                      {index > 0 ? <Divider /> : null}
                      <NavRow
                        href={`/workouts/${session.id}`}
                        meta={badge ? <Badge tone={badge.tone}>{badge.label}</Badge> : undefined}
                        subtitle={`${count} ${count === 1 ? 'ejercicio' : 'ejercicios'}${duration ? ` · ${duration}` : ''}`}
                        title={`${relativeDay(session.fechaInicio)}${startTime ? ` · ${startTime}` : ''}`}
                      />
                    </div>
                  );
                })}
              </ListCard>
            )}
            {sessions.length > 3 ? (
              <ButtonLink className="justify-self-start" href="/workouts" size="sm" variant="ghost">
                Ver todos mis entrenos <ArrowRight aria-hidden className="size-4" />
              </ButtonLink>
            ) : null}
          </Section>

          {/* La senda y la membresía vigente: una sola lista callada al final. */}
          {level || membershipData?.vigenteHoy ? (
            <ListCard>
              {level && progression.data ? (
                <Link className="tap grid gap-1 py-3" href="/trayectoria">
                  <span className="flex items-center gap-3">
                    <IconBadge icon={Award} size={36} tone="record" />
                    <span className="grid min-w-0 flex-1 gap-0.5">
                      <span className="t-headline truncate">{level.name}</span>
                      <span className="t-footnote tabular-nums text-[var(--text-muted)]">
                        {progression.data.nextLevel && progression.data.pointsToNextLevel !== null
                          ? `${progression.data.points.toLocaleString('es-ES')} pts · faltan ${progression.data.pointsToNextLevel.toLocaleString('es-ES')} para ${progression.data.nextLevel.name}`
                          : `${progression.data.points.toLocaleString('es-ES')} pts · senda completa`}
                      </span>
                    </span>
                  </span>
                  <span aria-hidden className="block h-1.5 overflow-hidden rounded-full bg-[var(--surface-highest)]">
                    <span
                      className="block h-full rounded-full bg-[var(--text-muted)]"
                      style={{ width: `${Math.round(progression.data.levelProgress * 100)}%` }}
                    />
                  </span>
                </Link>
              ) : null}
              {level && membershipData?.vigenteHoy ? <Divider /> : null}
              {membershipData?.vigenteHoy ? (
                <NavRow
                  href="/membership"
                  leading={<IconBadge icon={CreditCard} size={36} tone="record" />}
                  subtitle={`${membershipData.diasRestantes} ${membershipData.diasRestantes === 1 ? 'día restante' : 'días restantes'}`}
                  title={membershipData.plan?.nombre ?? 'Tu membresía'}
                />
              ) : null}
            </ListCard>
          ) : null}
        </div>
      </div>
    </div>
  );
}
