import { useQuery } from '@tanstack/react-query';
import { Redirect } from 'expo-router';
import { businessDestination, kycOutcomeFromState, kycPlace } from '@gymsheet/domain';
import { queryKeys } from '@gymsheet/hooks';
import { ErrorState, Skeleton } from '@/components/feedback';
import { ScrollScreen } from '@/components/layout';
import { businessService } from '@/features/business/business-service';
import { useKycState } from '@/features/business/kyc/kyc-service';
import { ResultView } from '@/features/business/kyc/result-view';

/** The KYC status on a later visit (published, in review, to correct, suspended), with resubmit and material change. */
export default function BusinessKycStatusScreen() {
  const kyc = useKycState();
  const me = useQuery({ queryKey: queryKeys.business.me, queryFn: businessService.me });

  if (kyc.isPending) {
    return (
      <ScrollScreen>
        <Skeleton height={120} />
      </ScrollScreen>
    );
  }
  if (kyc.isError) {
    return (
      <ScrollScreen>
        <ErrorState error={kyc.error} onRetry={() => void kyc.refetch()} />
      </ScrollScreen>
    );
  }
  if (kycPlace(kyc.data).kind === 'wizard') return <Redirect href={businessDestination.mobile.kycWizard} />;
  return (
    <ScrollScreen onRefresh={() => void kyc.refetch()} refreshing={kyc.isRefetching}>
      <ResultView outcome={kycOutcomeFromState(kyc.data, me.data?.handle?.handle ?? null)} />
    </ScrollScreen>
  );
}
