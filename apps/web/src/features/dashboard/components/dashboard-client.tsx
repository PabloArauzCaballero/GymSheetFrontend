'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  Bell,
  CalendarDays,
  ChevronRight,
  Dumbbell,
  IdCard,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import { accessService } from '@/features/access/services/access-service';
import { exerciseService } from '@/features/exercises/services/exercise-service';
import { membershipService } from '@/features/membership/services/membership-service';
import { notificationService } from '@/features/notifications/services/notification-service';
import { SendaCard } from '@/features/progression/components/senda-card';
import { progressionService } from '@/features/progression/services/progression-service';
import { workoutService } from '@/features/workouts/services/workout-service';
import { queryKeys } from '@/shared/api/query-keys';
import { EmptyState } from '@/shared/components/feedback/empty-state';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import {
  SkeletonCardGrid,
  SkeletonMetricRow,
  SkeletonPageHeader,
  SkeletonScreen,
} from '@/shared/components/feedback/skeleton';
import { PageHeader } from '@/shared/components/layout/page-header';
import { Badge } from '@/shared/components/ui/badge';
import { ButtonLink } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import { MetricCard } from '@/shared/components/ui/metric-card';
import { formatDateTime, formatDuration } from '@/shared/lib/date';

function totalVolume(workouts: Awaited<ReturnType<typeof workoutService.list>>['items']) {
  return workouts.reduce(
    (total, workout) =>
      total +
      workout.ejercicios.reduce(
        (exerciseTotal, exercise) =>
          exerciseTotal +
          exercise.series.reduce((setTotal, set) => setTotal + set.pesoKg * set.repeticiones, 0),
        0,
      ),
    0,
  );
}

export function DashboardClient() {
  const workouts = useQuery({
    queryKey: queryKeys.workouts(1),
    queryFn: () => workoutService.list(1, 5),
  });
  const favorites = useQuery({
    queryKey: queryKeys.favorites,
    queryFn: exerciseService.listFavorites,
  });
  const membership = useQuery({
    queryKey: queryKeys.membership,
    queryFn: membershipService.getMine,
    retry: false,
  });
  const notifications = useQuery({
    queryKey: queryKeys.notifications(1),
    queryFn: () => notificationService.list(1),
    retry: false,
  });
  const access = useQuery({
    queryKey: queryKeys.accessHistory(1),
    queryFn: () => accessService.getHistory(1),
    retry: false,
  });
  const progression = useQuery({
    queryKey: ['progression', 'me'],
    queryFn: progressionService.get,
    retry: false,
  });

  if (workouts.isLoading || favorites.isLoading) {
    return (
      <SkeletonScreen className="gap-10" label="Cargando tu panel">
        <SkeletonPageHeader withActions />
        <SkeletonMetricRow />
        <SkeletonCardGrid count={3} />
      </SkeletonScreen>
    );
  }

  /* Sin esta rama el panel trataba un fallo de red como «no tienes nada»:
     `data?.items ?? []` deja `sessions` vacío y abajo se pinta el estado vacío.
     El usuario concluía que había perdido sus sesiones. Las consultas
     secundarias (membresía, notificaciones, accesos) sí pueden fallar en
     silencio porque son adornos; estas dos son la página. */
  if (workouts.isError || favorites.isError) {
    return (
      <ErrorPanel
        message={
          (workouts.error ?? favorites.error)?.message ?? 'No se pudo cargar tu actividad reciente.'
        }
        onRetry={() => {
          void workouts.refetch();
          void favorites.refetch();
        }}
      />
    );
  }

  const sessions = workouts.data?.items ?? [];
  const active = sessions.find((session) => session.estado === 'EN_PROGRESO');
  const latest = sessions[0];
  const unread = notifications.data?.items.filter((item) => !item.leidoEn).length ?? 0;

  return (
    <div className="grid gap-10">
      <PageHeader
        actions={
          <span data-tutorial-id="dashboard:start-workout">
            {active ? (
              <ButtonLink href={`/workouts/${active.id}`} variant="primary">
                Continuar sesión
              </ButtonLink>
            ) : (
              <ButtonLink href="/workouts/new" variant="primary">
                Iniciar entrenamiento
              </ButtonLink>
            )}
          </span>
        }
        description="Tu superficie operativa: entrenamiento activo, progreso reciente y señales que requieren atención."
        eyebrow="Centro de rendimiento"
        title="Precisión antes que ruido."
        tutorialId="page:dashboard"
      />

      {/* La senda, antes que los indicadores.
          Es la única tarjeta que responde «¿me estoy acercando a como quiero
          verme?», que es la razón por la que alguien vuelve. El resto del panel
          informa; esta tira. Es el reflejo exacto de la tarjeta de Inicio en el
          móvil: mismo rango, misma barra, mismo texto de distancia. */}
      {progression.data?.level ? (
        <SendaCard progression={progression.data} />
      ) : null}

      <section
        aria-label="Indicadores"
        data-tutorial-id="dashboard:metrics"
        className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <MetricCard
          accent
          icon={<Activity className="size-5" />}
          label="Sesiones recientes"
          value={sessions.length}
        />
        <MetricCard
          icon={<TrendingUp className="size-5" />}
          label="Volumen registrado"
          suffix="KG"
          value={Math.round(totalVolume(sessions)).toLocaleString('es-BO')}
        />
        <MetricCard
          icon={<Dumbbell className="size-5" />}
          label="Ejercicios frecuentes"
          value={favorites.data?.length ?? 0}
        />
        <MetricCard icon={<Bell className="size-5" />} label="Avisos sin leer" value={unread} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <Card>
          <CardHeader
            action={
              <ButtonLink href="/workouts" size="sm" variant="ghost">
                Ver historial
              </ButtonLink>
            }
            description="Las últimas sesiones registradas por tu cuenta."
            title="Actividad reciente"
          />
          <CardContent className="p-0">
            {sessions.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  description="Inicia una sesión para construir un historial verificable."
                  title="Todavía no hay entrenamientos"
                />
              </div>
            ) : (
              <div className="stagger divide-y divide-[var(--border-subtle)]">
                {sessions.map((session) => (
                  <Link
                    className="tap group flex items-center gap-4 p-5 hover:bg-[var(--surface-low)]"
                    href={`/workouts/${session.id}`}
                    key={session.id}
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-low)] text-[var(--text-muted)]">
                      <Activity className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{formatDateTime(session.fechaInicio)}</p>
                      <p className="mt-1 text-sm text-[var(--text-muted)]">
                        {session.ejercicios.length} ejercicios ·{' '}
                        {formatDuration(session.fechaInicio, session.fechaFin)}
                      </p>
                    </div>
                    <Badge
                      tone={
                        session.estado === 'FINALIZADA'
                          ? 'success'
                          : session.estado === 'CANCELADA'
                            ? 'danger'
                            : 'warning'
                      }
                    >
                      {session.estado}
                    </Badge>
                    <ChevronRight className="size-4 shrink-0 text-[var(--text-disabled)] transition-colors duration-[var(--dur-2)] group-hover:text-[var(--text-muted)]" />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-5">
          <Card>
            <CardHeader title="Membresía" />
            <CardContent>
              {membership.data?.membership ? (
                <div className="grid gap-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold">{membership.data.membership.plan?.nombre ?? 'Plan activo'}</p>
                      <p className="mt-1 text-sm text-[var(--text-muted)]">
                        Vence en {membership.data.membership.diasRestantes} días
                      </p>
                    </div>
                    <IdCard className="size-5 text-[var(--accent-ink)]" />
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-high)]">
                    <div
                      className="h-full rounded-full bg-[var(--volt)] transition-[width] duration-[var(--dur-6)] ease-[var(--ease-out)]"
                      style={{
                        width: `${Math.max(4, Math.min(100, membership.data.membership.diasRestantes))}%`,
                      }}
                    />
                  </div>
                </div>
              ) : (
                <p className="text-sm leading-6 text-[var(--text-muted)]">
                  No existe una membresía visible para esta cuenta.
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader title="Último acceso" />
            <CardContent>
              {access.data?.items[0] ? (
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">
                      {formatDateTime(access.data.items[0].decididoEn)}
                    </p>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">
                      {access.data.items[0].razon}
                    </p>
                  </div>
                  <Badge tone={access.data.items[0].resultado === 'GRANTED' ? 'success' : 'danger'}>
                    {access.data.items[0].resultado}
                  </Badge>
                </div>
              ) : (
                <div className="flex items-center gap-3 text-sm text-[var(--text-muted)]">
                  <CalendarDays className="size-4" /> Sin eventos recientes
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {latest ? (
        <p className="text-xs text-[var(--text-disabled)]">
          Última actualización visible: {formatDateTime(latest.fechaInicio)}
        </p>
      ) : null}
    </div>
  );
}
