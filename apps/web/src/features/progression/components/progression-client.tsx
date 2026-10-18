'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Info, Sparkles } from 'lucide-react';
import { useState } from 'react';
import type { Challenge, LeaderboardSortBy, Prize, ProgressionBadge } from '@/shared/api/schemas';
import { progressionService } from '@/features/progression/services/progression-service';
import {
  Skeleton,
  SkeletonCardGrid,
  SkeletonPageHeader,
  SkeletonScreen,
} from '@/shared/components/feedback/skeleton';
import { PageHeader } from '@/shared/components/layout/page-header';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import { ProgressionCelebration, useLevelUpWatch, useRewardQueue } from './progression-celebration';
import { BadgeCollection } from './badge-collection';
import { NearestBadges } from './nearest-badges';
import { PrizesCard } from './prize-tickets';
import { BadgeTile, PathNode, RankHero } from './progression-parts';
import { LeaderboardCard, RestDaysCard } from './progression-secondary-cards';
import { ProgressionStatsCard } from './progression-stats-card';
import { PointsRulesDialog, usePointRules } from './points-rules-dialog';
import { StreakCard } from './streak-card';
import { ChallengesCard } from './weekly-challenges';

/**
 * La senda en la web.
 *
 * Mismo relato y mismo orden que la pantalla del móvil, ordenado por urgencia
 * —quién eres, los retos de esta semana, tus premios, la racha, lo que casi
 * tienes, la colección, el camino y lo demás—, porque
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

  // La explicación de los puntos: el diálogo y los chips de tarifa salen de las
  // mismas reglas publicadas por el servidor.
  const [rulesOpen, setRulesOpen] = useState(false);
  const rules = usePointRules();

  const data = progression.data;
  // Los hooks de la celebración van antes de los retornos tempranos, para no
  // alterar su orden entre estados de carga. Lo nuevo se abre solo una vez por
  // visita y se confirma al servidor; las revisitas, al tocar.
  const levelUp = useLevelUpWatch(progression.data?.level ?? null);
  const rewards = useRewardQueue(data, levelUp, () => acknowledge.mutate());
  const celebrateBadge = (earned: ProgressionBadge) =>
    rewards.show([{ kind: 'badge', badge: earned, fresh: false }]);
  const openChallenge = (challenge: Challenge) =>
    rewards.show([{ kind: 'challenge', challenge, fresh: false }]);
  const openPrize = (prize: Prize) => rewards.show([{ kind: 'prize', prize, fresh: false }]);
  const unlockedNow = data?.unlockedNow ?? [];

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
  const level = data.level;
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
            : `Termina tu primer entreno: +${rules.data?.perSession ?? 50} puntos y tu primera insignia.`
        }
        eyebrow="Progresión"
        title="Tu senda"
      />

      <div className="grid gap-4">
        <div data-tutorial-id="progression:rank">
          <RankHero
            level={data.level}
            levelProgress={data.levelProgress}
            nextLevel={data.nextLevel}
            points={data.points}
            pointsToNextLevel={data.pointsToNextLevel}
          />
        </div>
        <Button
          className="justify-self-start"
          data-tutorial-id="progression:rules"
          onClick={() => setRulesOpen(true)}
          variant="ghost"
        >
          <Info aria-hidden className="size-4" />
          ¿Cómo se ganan los puntos?
        </Button>
        {/* Se celebra desde aquí y no convirtiendo `RankHero` en botón: esa
            cabecera la comparten otras pantallas. */}
        {level ? (
          <Button
            className="justify-self-start"
            onClick={() => rewards.show([{ kind: 'level', level }])}
            variant={levelUp ? 'primary' : 'secondary'}
          >
            <Sparkles aria-hidden className="size-4" />
            {levelUp ? `Has subido a ${levelUp.name}` : 'Ver mi carta de rango'}
          </Button>
        ) : null}
      </div>

      {unlockedNow.length > 0 ? (
        <Card>
          <CardHeader
            description="Se muestran una sola vez. A partir de ahora viven en tu colección."
            title="Acabas de desbloquear"
          />
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {unlockedNow.map((badge) => (
              <BadgeTile badge={badge} key={badge.code} onCelebrate={celebrateBadge} />
            ))}
          </CardContent>
        </Card>
      ) : null}

      {data.challenges ? <ChallengesCard onOpen={openChallenge} week={data.challenges} /> : null}

      <PrizesCard onOpen={openPrize} prizes={data.prizes} />

      {data.streak || data.nearest.length > 0 ? (
        <div className="grid gap-10 lg:grid-cols-2">
          {data.streak ? <StreakCard rules={rules.data} streak={data.streak} /> : null}
          {data.nearest.length > 0 ? (
            <Card>
              <CardHeader description="Las insignias que casi tienes." title="Lo más cerca" />
              <CardContent>
                <NearestBadges badges={data.nearest} />
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : null}

      <BadgeCollection badges={data.badges} onCelebrate={celebrateBadge} />

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card data-tutorial-id="progression:path">
          <CardHeader
            description="Todos los rangos, también los que te quedan. Cada uno pide más puntos que el anterior."
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
          <ProgressionStatsCard
            rules={rules.data}
            stats={stats}
            streakShown={Boolean(data.streak)}
          />

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

      <PointsRulesDialog
        badges={data.badges}
        onOpenChange={setRulesOpen}
        open={rulesOpen}
        points={data.points}
        stats={stats}
      />

      <ProgressionCelebration onClose={rewards.close} subjects={rewards.subjects} />
    </div>
  );
}
