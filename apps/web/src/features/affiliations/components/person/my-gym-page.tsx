'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { queryKeys } from '@/shared/api/query-keys';
import type { LeaderboardSortBy } from '@/shared/api/schemas';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { Skeleton } from '@/shared/components/feedback/skeleton';
import { PageHeader } from '@/shared/components/layout/page-header';
import { LeaderboardCard } from '@/features/progression/components/progression-secondary-cards';
import { progressionService } from '@/features/progression/services/progression-service';
import { gymGateOf } from '../../services/affiliations-client';
import { GymMembers } from './gym-members';
import { MembershipVisibility } from './membership-visibility';
import { MyGymCard } from './my-gym-card';
import { useMyGym } from './use-my-gym';

const RANKING_SIZE = 10;

function GymLeaderboard() {
  const [sortBy, setSortBy] = useState<LeaderboardSortBy>('points');
  const ranking = useQuery({
    queryKey: [...queryKeys.leaderboard, sortBy, RANKING_SIZE],
    queryFn: () => progressionService.leaderboard(RANKING_SIZE, sortBy),
  });
  if (ranking.isPending) return <Skeleton className="h-64 rounded-[var(--radius-lg)]" />;
  const gate = gymGateOf(ranking.error);
  if (ranking.isError && !gate) return <ErrorPanel error={ranking.error} message="No pudimos cargar la clasificación." onRetry={() => void ranking.refetch()} />;
  return <LeaderboardCard entries={ranking.data ?? []} gate={gate} limit={RANKING_SIZE} onSortChange={setSortBy} sortBy={sortBy} />;
}

/**
 * «Mi gimnasio» (franja 7c): driven by `GET /me/gym`, never by the session's
 * tenant. The ranking and the members only open with a confirmed SOCIO.
 */
export function MyGymPage() {
  const myGym = useMyGym();
  return (
    <div className="mx-auto grid w-full max-w-2xl gap-8">
      <PageHeader description="Tu gimnasio, su clasificación y sus socios." title="Mi gimnasio" />
      {myGym.isPending ? (
        <Skeleton className="h-40 rounded-[var(--radius-lg)]" />
      ) : myGym.isError ? (
        <ErrorPanel error={myGym.error} message="No pudimos cargar tu gimnasio." onRetry={() => void myGym.refetch()} />
      ) : (
        <>
          <MyGymCard myGym={myGym.data} />
          {myGym.data.status === 'CONFIRMED' ? (
            <>
              <MembershipVisibility myGym={myGym.data} />
              <GymLeaderboard />
              <GymMembers />
            </>
          ) : null}
        </>
      )}
      <Link className="t-subhead w-fit font-semibold underline underline-offset-4" href="/profile/afiliaciones">
        Mis afiliaciones
      </Link>
    </div>
  );
}
