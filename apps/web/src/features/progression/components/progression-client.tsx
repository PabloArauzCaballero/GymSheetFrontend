'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { Award, CalendarDays, Dumbbell, Flame, PersonStanding, TrendingUp } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { progressionService } from '@/features/progression/services/progression-service';
import { LoadingPanel } from '@/shared/components/feedback/loading-panel';
import { PageHeader } from '@/shared/components/layout/page-header';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import { MetricCard } from '@/shared/components/ui/metric-card';
import { cn } from '@/shared/lib/cn';
import { BadgeTile, PathNode, RankHero } from './progression-parts';

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
  const progression = useQuery({
    queryKey: ['progression', 'me'],
    queryFn: progressionService.get,
  });
  const leaderboard = useQuery({
    queryKey: ['progression', 'leaderboard'],
    queryFn: () => progressionService.leaderboard(5),
    retry: false,
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

  if (progression.isLoading) return <LoadingPanel rows={6} />;
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

          <Card>
            <CardHeader
              description="Solo nombre e inicial: la tabla no es una lista de socios."
              title="Clasificación del gimnasio"
            />
            <CardContent className="grid gap-3">
              {(leaderboard.data ?? []).map((entry) => (
                <div
                  className="flex items-center gap-4"
                  key={`${entry.position}-${entry.displayName}`}
                >
                  <span
                    className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                      entry.isMe
                        ? 'bg-[var(--volt)] text-[var(--background)]'
                        : 'bg-[var(--surface-high)] text-[var(--text-muted)]',
                    )}
                  >
                    {entry.position}
                  </span>
                  <span
                    className={cn(
                      'flex-1 truncate text-sm',
                      entry.isMe
                        ? 'font-semibold text-[var(--text)]'
                        : 'text-[var(--text-muted)]',
                    )}
                  >
                    {entry.displayName}
                    {entry.isMe ? ' · tú' : ''}
                  </span>
                  <span className="text-sm text-[var(--text-muted)]">
                    {entry.points.toLocaleString('es-ES')}
                  </span>
                </div>
              ))}
              {(leaderboard.data ?? []).length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">
                  Todavía no hay nadie en la tabla. Entrena y sé el primero.
                </p>
              ) : null}
            </CardContent>
          </Card>
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
