import { queryKeys } from '@gymsheet/hooks';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ErrorState, RowsSkeleton } from '@/components/feedback';
import { ScreenHeader, ScrollScreen } from '@/components/layout';
import { LeaderboardSection } from '@/components/progression/leaderboard';
import { Button } from '@/components/ui';
import { personAffiliationsService } from '@/features/affiliations/affiliations-service';
import { GymMembers } from '@/features/affiliations/gym-members';
import { MembershipVisibility } from '@/features/affiliations/membership-visibility';
import { MyGymCard } from '@/features/affiliations/my-gym-card';

/**
 * «Mi gimnasio» (franja 7c): driven by `GET /me/gym`, never by the session's
 * tenant. The ranking and the members only open with a confirmed SOCIO.
 */
export default function MyGymScreen() {
  const router = useRouter();
  const myGym = useQuery({ queryKey: queryKeys.myGym, queryFn: personAffiliationsService.myGym, staleTime: 30_000 });
  return (
    <ScrollScreen onRefresh={() => void myGym.refetch()} refreshing={myGym.isRefetching}>
      <ScreenHeader detail subtitle="Tu gimnasio, su clasificación y sus socios." title="Mi gimnasio" />
      {myGym.isPending ? (
        <RowsSkeleton rows={2} />
      ) : myGym.isError ? (
        <ErrorState error={myGym.error} onRetry={() => void myGym.refetch()} />
      ) : (
        <>
          <MyGymCard myGym={myGym.data} />
          {myGym.data.status === 'CONFIRMED' ? (
            <>
              <MembershipVisibility myGym={myGym.data} />
              <LeaderboardSection limit={10} />
              <GymMembers />
            </>
          ) : null}
        </>
      )}
      <Button label="Mis afiliaciones" onPress={() => router.push('/afiliaciones')} variant="ghost" />
    </ScrollScreen>
  );
}
