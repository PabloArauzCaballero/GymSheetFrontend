import { useQuery } from '@tanstack/react-query';
import { Redirect } from 'expo-router';
import { View } from 'react-native';
import { businessDestination, businessResumeStep, businessWizardCopy } from '@gymsheet/domain';
import { queryKeys } from '@gymsheet/hooks';
import { ErrorState, Skeleton } from '@/components/feedback';
import { ScrollScreen } from '@/components/layout';
import { Button } from '@/components/ui';
import { BusinessHome } from '@/features/business/business-home';
import { businessService } from '@/features/business/business-service';
import { useAuthStore } from '@/state/auth-store';
import { spacing } from '@/theme';

/** Business «Inicio». While the signup's steps 2–3 are missing, «completar» resumes them. */
export default function BusinessHomeScreen() {
  const logout = useAuthStore((state) => state.logout);
  const me = useQuery({ queryKey: queryKeys.business.me, queryFn: businessService.me });

  if (me.data && businessResumeStep(me.data.nextSteps) !== null) {
    return <Redirect href={businessDestination.mobile.completion} />;
  }

  return (
    <ScrollScreen onRefresh={() => void me.refetch()} refreshing={me.isRefetching}>
      {me.isPending ? (
        <View style={{ gap: spacing.md }}>
          <Skeleton height={64} />
          <Skeleton height={56} />
          <Skeleton height={72} />
        </View>
      ) : me.isError ? (
        <ErrorState error={me.error} onRetry={() => void me.refetch()} />
      ) : (
        <BusinessHome me={me.data} />
      )}
      <Button label={businessWizardCopy.logout} onPress={() => void logout()} variant="ghost" />
    </ScrollScreen>
  );
}
