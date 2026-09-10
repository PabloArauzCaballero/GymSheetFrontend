'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Award, CalendarDays, Dumbbell, Flame, PersonStanding, TrendingUp } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { LeaderboardSortBy } from '@/shared/api/schemas';
import { progressionService } from '@/features/progression/services/progression-service';
import {
  Skeleton,
  SkeletonCardGrid,
  SkeletonPageHeader,
  SkeletonScreen,
} from '@/shared/components/feedback/skeleton';
import { PageHeader } from '@/shared/components/layout/page-header';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import { MetricCard } from '@/shared/components/ui/metric-card';
import { BadgeTile, PathNode, RankHero } from './progression-parts';
import { LeaderboardCard, RestDaysCard } from './progression-secondary-cards';

/**
 * La senda en la web.
 *
 * Mismo relato y mismo orden que la pantalla del móvil —quién eres, lo recién
 * conseguido, el camino, lo que suma, las insignias y la clasificación—, porque
 * las dos son la misma función del producto y quien use ambas no debería tener
 * que reaprenderla. Lo único que cambia es el aprovechamiento del ancho: en
 * escritorio el camino y las cifras van en dos columnas, donde el móvil apila.
 */

export function ProgressionClient() {
  const queryClient = useQueryClient();
  const progression = useQuery({
    queryKey: ['progression', 'me'],
    queryFn: progressionService.get,
  });
  const [leaderboardSort, setLeaderboardSort] = useState<LeaderboardSortBy>('points');
  const leaderboard = useQuery({
    queryKey: ['progression', 'leaderboard', leaderboardSort],
    queryFn: () => progressionService.leaderboard(5, leaderboardSort),
    retry: false,
  });
  const restDays = useQuery({
    queryKey: ['progression', 'rest-days'],
    queryFn: progressionService.getRestDays,
  });
  const setRestDays = useMutation({
    mutationFn: (weekdays: number[]) => progressionService.setRestDays(weekdays),
    onSuccess: (data) => {
      queryClient.setQueryData(['progression', 'rest-days'], data);
    },
  });

  const acknowledge = useMutation({ mutationFn: progressionService.acknowledge });

  const data = progression.data;
  const unlockedNow = data?.unlockedNow ?? [];

  /**
   * Se confirma en cuanto la celebración está en pantalla, no al salir: si la
   * pestaña se cierra desde aquí, ya se ha visto, y volver a celebrarla mañana
   * la convertiría en ruido.
   *
   * `acknowledge.mutate` se omite de las dependencias a propósito: react-query
   * devuelve una función nueva en cada render y el efecto entraría en bucle. Lo
   * que debe dispararlo es que aparezcan novedades.
   */
  const newlyEarnedCount = unlockedNow.length;
  useEffect(() => {
    if (newlyEarnedCount > 0) acknowledge.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newlyEarnedCount]);

  // Conseguidas primero: el muro de trofeos es lo que da la sensación de
  // avance. Dentro de cada mitad se respeta el orden del catálogo.
  const badges = useMemo(() => {
    const all = data?.badges ?? [];
    return [...all.filter((badge) => badge.earned), ...all.filter((badge) => !badge.earned)];
  }, [data?.badges]);

  if (progression.isLoading) {
    return (
      <SkeletonScreen className="gap-10" label="Cargando tu senda">
        <SkeletonPageHeader />
        <Skeleton className="h-44 w-full rounded-[var(--radius-lg)]" />
        <SkeletonCardGrid count={6} />
      </SkeletonScreen>
    );
  }
  if (progression.isError || !data) {
    return (
      <div className="grid gap-10">
        <PageHeader
          description="Tu camino hacia la imagen que buscas."
          eyebrow="Progresión"
          title="Tu senda"
        />
        <Card>
          <CardContent>
            <p className="text-sm text-[var(--text-muted)]">
              No pudimos cargar tu senda. Vuelve a intentarlo en un momento.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = data.stats;
  const earnedCount = badges.filter((badge) => badge.earned).length;
  const currentRestDays = restDays.data?.weekdays ?? [];

  function toggleRestDay(day: number) {
    const isRestDay = currentRestDays.includes(day);
    // Los siete días de descanso dejarían la racha imposible de romper, así
    // que el backend lo rechaza; se evita aquí para no mostrar un error por
    // algo que la interfaz puede prevenir sola.
    if (!isRestDay && currentRestDays.length >= 6) return;
    const next = isRestDay
      ? currentRestDays.filter((value) => value !== day)
      : [...currentRestDays, day];
    setRestDays.mutate(next);
  }

  return (
    <div className="grid gap-10">
      <PageHeader
        description={
          data.level
            ? `Vas por ${data.level.name}. Sigue subiendo.`
            : 'Registra tu primer entrenamiento y la senda empieza.'
        }
        eyebrow="Progresión"
        title="Tu senda"
      />

      <RankHero
        level={data.level}
        levelProgress={data.levelProgress}
        nextLevel={data.nextLevel}
        points={data.points}
        pointsToNextLevel={data.pointsToNextLevel}
      />

      {unlockedNow.length > 0 ? (
        <Card>
          <CardHeader
            description="Se muestran una sola vez. A partir de ahora viven en tu colección."
            title="Acabas de desbloquear"
          />
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {unlockedNow.map((badge) => (
              <BadgeTile badge={badge} key={badge.code} />
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader
            description="Los hitos que quedan también se ven: saber hacia dónde vas es lo que tira."
            title="El camino"
          />
          <CardContent>
            <ol className="grid">
              {data.path.map((level, index) => (
                <PathNode
                  isLast={index === data.path.length - 1}
                  key={level.code}
                  level={level}
                  points={data.points}
                />
              ))}
            </ol>
          </CardContent>
        </Card>

        <div className="grid content-start gap-10">
          <Card>
            <CardHeader description="Las cifras que mueven tus puntos." title="Lo que suma" />
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <MetricCard
                icon={<Flame aria-hidden className="h-4 w-4" />}
                label="Racha actual"
                value={
                  stats.currentStreakDays > 0
                    ? `${stats.currentStreakDays} ${stats.currentStreakDays === 1 ? 'día' : 'días'}`
                    : '—'
                }
              />
              <MetricCard
                icon={<CalendarDays aria-hidden className="h-4 w-4" />}
                label="Semanas seguidas"
                value={`${stats.weeklyStreak}`}
              />
              <MetricCard
                icon={<Dumbbell aria-hidden className="h-4 w-4" />}
                label="Entrenamientos"
                value={`${stats.totalSessions}`}
              />
              <MetricCard
                icon={<Award aria-hidden className="h-4 w-4" />}
                label="Volumen total"
                value={`${Math.round(stats.totalVolumeKg / 1000).toLocaleString('es-ES')} t`}
              />
              <MetricCard
                icon={<TrendingUp aria-hidden className="h-4 w-4" />}
                label="Récords batidos"
                value={`${stats.personalRecords}`}
              />
              <MetricCard
                icon={<PersonStanding aria-hidden className="h-4 w-4" />}
                label="Grupos trabajados"
                value={`${stats.distinctMuscleGroups}`}
              />
              {stats.currentStreakDays === 0 && stats.totalSessions > 0 ? (
                // Una racha rota es un hecho, no un reproche: el texto invita a
                // empezar otra hoy y no menciona el fallo.
                <p className="text-xs leading-5 text-[var(--text-muted)] sm:col-span-2">
                  Tu racha está en cero. Un entrenamiento hoy y vuelve a contar.
                </p>
              ) : null}
            </CardContent>
          </Card>

          <RestDaysCard
            currentRestDays={currentRestDays}
            onToggle={toggleRestDay}
            pending={setRestDays.isPending}
          />

          <LeaderboardCard
            entries={leaderboard.data ?? []}
            onSortChange={setLeaderboardSort}
            sortBy={leaderboardSort}
          />
        </div>
      </div>

      <Card>
        <CardHeader
          description="Las que faltan muestran cuánto te queda; las secretas aparecen ya conseguidas."
          title={`Insignias · ${earnedCount}/${badges.length}`}
        />
        <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {badges.map((badge) => (
            <BadgeTile badge={badge} key={badge.code} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
