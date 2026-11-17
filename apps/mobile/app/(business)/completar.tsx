import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { businessDestination, businessResumeStep, businessWizardCopy } from '@gymsheet/domain';
import { queryKeys } from '@gymsheet/hooks';
import { ErrorState, Skeleton } from '@/components/feedback';
import { ScreenHeader, ScrollScreen } from '@/components/layout';
import { Text } from '@/components/text';
import { Button } from '@/components/ui';
import { businessService } from '@/features/business/business-service';
import { ProfileForm } from '@/features/business/profile-form';
import { VerifyStep } from '@/features/business/verify-step';
import { useAuthStore } from '@/state/auth-store';
import { spacing } from '@/theme';

/**
 * Business signup, steps 2–3 (ADR-0020): «Verifica tu correo» and «Tu
 * negocio», resumed from `GET /business/me` `nextSteps`. Done, the KYC
 * (steps 4–7, «verificar») follows; `?editar=1` reopens «Tu negocio» from its review.
 */
export default function BusinessCompletionScreen() {
  const router = useRouter();
  const { editar } = useLocalSearchParams<{ editar?: string }>();
  const queryClient = useQueryClient();
  const logout = useAuthStore((state) => state.logout);
  const me = useQuery({ queryKey: queryKeys.business.me, queryFn: businessService.me });
  const [verifiedNow, setVerifiedNow] = useState(false);
  const onVerified = useCallback(() => {
    setVerifiedNow(true);
    void queryClient.invalidateQueries({ queryKey: queryKeys.business.me });
  }, [queryClient]);

  if (me.isPending) {
    return (
      <ScrollScreen>
        <View style={{ gap: spacing.md }}>
          <Skeleton height={48} />
          <Skeleton height={56} />
          <Skeleton height={56} />
        </View>
      </ScrollScreen>
    );
  }
  if (me.isError) {
    return (
      <ScrollScreen>
        <ErrorState error={me.error} onRetry={() => void me.refetch()} />
      </ScrollScreen>
    );
  }
  const resume = businessResumeStep(me.data.nextSteps);
  const step = resume === 2 && verifiedNow ? 3 : (resume ?? (editar === '1' ? 3 : null));
  if (step === null) return <Redirect href={businessDestination.mobile.home} />;
  const copy = businessWizardCopy.steps[step];

  return (
    <ScrollScreen>
      <ScreenHeader detail subtitle={copy.description} title={copy.title} />
      <Text tone="secondary" variant="footnote">{businessWizardCopy.progress(step)}</Text>
      {step === 2 ? (
        <VerifyStep email={me.data.account.email} onVerified={onVerified} />
      ) : (
        <ProfileForm
          entityType={me.data.entity.entityType}
          initial={{
            name: me.data.entity.name,
            ...(me.data.handle ? { handle: me.data.handle.handle } : {}),
            ...(me.data.entity.primaryCategoryId ? { primaryCategoryId: me.data.entity.primaryCategoryId } : {}),
            ...(me.data.entity.city ? { city: me.data.entity.city } : {}),
          }}
          onSaved={async () => {
            // Fresh `nextSteps` first, or the KYC would read the cached ones and send the person back here.
            await queryClient.invalidateQueries({ queryKey: queryKeys.business.me });
            router.replace(businessDestination.mobile.kycWizard);
          }}
        />
      )}
      <Button label={businessWizardCopy.logout} onPress={() => void logout()} variant="ghost" />
    </ScrollScreen>
  );
}
