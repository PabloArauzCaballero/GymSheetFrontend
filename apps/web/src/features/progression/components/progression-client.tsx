'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, Flame, Info, LocateFixed, Signpost, Sparkles } from 'lucide-react';
import { Section } from '@/shared/components/mobile/section';
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
import { Card, CardContent } from '@/shared/components/ui/card';
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
    // El orden de `trayectoria.tsx` del móvil: rango, «cómo se ganan», el
    // camino, la carta de rango, retos, premios, racha, descansos, lo más
    // cerca y la colección. Las estadísticas y el ranking (solo web) al final.
    <div className="mx-auto grid w-full max-w-[560px] gap-8 lg:max-w-[760px]">
      <PageHeader
        description={
          data.level
            ? `Vas por ${data.level.name}. Sigue subiendo.`
            : `Termina tu primer entreno: +${rules.data?.perSession ?? 50} puntos y tu primera insignia.`
        }
        title="Tu senda"
      />

      <div className="grid gap-3">
        <div data-tutorial-id="progression:rank">
          <RankHero
            level={data.level}
            levelProgress={data.levelProgress}
            nextLevel={data.nextLevel}
            points={data.points}
            pointsToNextLevel={data.pointsToNextLevel}
          />
        </div>
        <button
          className="t-subhead inline-flex min-h-11 w-fit items-center gap-2 font-semibold text-[var(--accent-ink)]"
          data-tutorial-id="progression:rules"
          onClick={() => setRulesOpen(true)}
          type="button"
        >
          <Info aria-hidden className="size-5" />
          ¿Cómo se ganan los puntos?
        </button>
      </div>

      {unlockedNow.length > 0 ? (
        <Section icon={Sparkles} title="Acabas de desbloquear">
          <div className="grid gap-3 sm:grid-cols-2">
            {unlockedNow.map((badge) => (
              <BadgeTile badge={badge} key={badge.code} onCelebrate={celebrateBadge} />
            ))}
          </div>
        </Section>
      ) : null}

      <Section icon={Signpost} title="El camino">
        <div className="panel p-5" data-tutorial-id="progression:path">
          <ol className="grid">
            {data.path.map((item, index) => (
              <PathNode isLast={index === data.path.length - 1} key={item.code} level={item} points={data.points} />
            ))}
          </ol>
        </div>
      </Section>

      {/* La carta de rango: una fila que se toca, como en el móvil. */}
      {level ? (
        <button
          className="panel tap flex items-center gap-4 p-5 text-left"
          onClick={() => rewards.show([{ kind: 'level', level }])}
          type="button"
        >
          <Sparkles aria-hidden className="size-6 shrink-0 text-[var(--accent-ink)]" />
          <span className="grid flex-1 gap-0.5">
            <span className="t-headline">{levelUp ? `Has subido a ${levelUp.name}` : `Rango ${level.name}`}</span>
            <span className="t-caption text-[var(--text-muted)]">Toca para ver tu carta de rango</span>
          </span>
          <ChevronRight aria-hidden className="size-5 text-[var(--text-muted)]" />
        </button>
      ) : null}

      {data.challenges ? <ChallengesCard onOpen={openChallenge} week={data.challenges} /> : null}

      <PrizesCard onOpen={openPrize} prizes={data.prizes} />

      {data.streak ? (
        <Section icon={Flame} title="Tu racha">
          <StreakCard rules={rules.data} streak={data.streak} />
        </Section>
      ) : null}

      <RestDaysCard currentRestDays={currentRestDays} onToggle={toggleRestDay} pending={setRestDays.isPending} />

      {data.nearest.length > 0 ? (
        <Section icon={LocateFixed} title="Lo más cerca">
          <div className="panel p-5">
            <NearestBadges badges={data.nearest} />
          </div>
        </Section>
      ) : null}

      <BadgeCollection badges={data.badges} onCelebrate={celebrateBadge} />

      <ProgressionStatsCard rules={rules.data} stats={stats} streakShown={Boolean(data.streak)} />

      <LeaderboardCard entries={leaderboard.data ?? []} onSortChange={setLeaderboardSort} sortBy={leaderboardSort} />

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
