import { useQuery } from '@tanstack/react-query';
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import {
  businessDestination,
  businessResumeStep,
  businessWizardCopy,
  kycOutcomeFromSubmit,
  kycPlace,
  type BusinessWizardStep,
  type KycLegalPart,
} from '@gymsheet/domain';
import { queryKeys } from '@gymsheet/hooks';
import type { KycSubmitResult } from '@gymsheet/schemas';
import { ErrorState, Skeleton } from '@/components/feedback';
import { ScreenHeader, ScrollScreen } from '@/components/layout';
import { Text } from '@/components/text';
import { businessService } from '@/features/business/business-service';
import { DocumentsStep } from '@/features/business/kyc/documents-step';
import { useKycState } from '@/features/business/kyc/kyc-service';
import { LegalStep } from '@/features/business/kyc/legal-step';
import { PhoneStep } from '@/features/business/kyc/phone-step';
import { ResultView } from '@/features/business/kyc/result-view';
import { ReviewStep } from '@/features/business/kyc/review-step';
import { spacing } from '@/theme';

type Place = { step: BusinessWizardStep; part?: KycLegalPart; notice?: string };

/**
 * Business signup, steps 4–7 (KYC, ADR-0021): phone, legal data, documents
 * and review, resumed at the exact step from `GET /business/me/kyc`, ending
 * on the result. Steps 2–3 live in «completar»; a decided attempt in «verificacion».
 */
export default function BusinessKycWizardScreen() {
  const router = useRouter();
  const kyc = useKycState();
  const me = useQuery({ queryKey: queryKeys.business.me, queryFn: businessService.me });
  const [place, setPlace] = useState<Place | null>(null);
  const [result, setResult] = useState<KycSubmitResult | null>(null);

  if (me.data && businessResumeStep(me.data.nextSteps) !== null) return <Redirect href={businessDestination.mobile.completion} />;
  if (kyc.isPending) {
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
  if (kyc.isError) {
    return (
      <ScrollScreen>
        <ErrorState error={kyc.error} onRetry={() => void kyc.refetch()} />
      </ScrollScreen>
    );
  }
  if (result) {
    return (
      <ScrollScreen>
        <ResultView outcome={kycOutcomeFromSubmit(result)} />
      </ScrollScreen>
    );
  }
  const resumed = kycPlace(kyc.data);
  if (!place && resumed.kind === 'result') return <Redirect href={businessDestination.mobile.kyc} />;
  const current: Place = place ?? (resumed.kind === 'wizard' ? { step: resumed.step, ...(resumed.part ? { part: resumed.part } : {}) } : { step: 4 });
  const go = (step: BusinessWizardStep, part?: KycLegalPart, notice?: string) => {
    // «Tu negocio» (step 3) is edited in «completar».
    if (step < 4) return router.push({ pathname: businessDestination.mobile.completion, params: { editar: '1' } });
    setPlace({ step, ...(part ? { part } : {}), ...(notice ? { notice } : {}) });
  };
  const leave = () => (router.canGoBack() ? router.back() : router.replace(businessDestination.mobile.home));
  const copy = businessWizardCopy.steps[current.step];
  const state = kyc.data;
  const legalKind = state.submission?.legalKind ?? me.data?.account.legalKind ?? 'COMPANY';

  return (
    <ScrollScreen>
      <ScreenHeader detail subtitle={copy.description} title={copy.title} />
      <Text tone="secondary" variant="footnote">{businessWizardCopy.progress(current.step)}</Text>
      {current.notice ? <Text accessibilityLiveRegion="polite" tone="warning" variant="subhead">{current.notice}</Text> : null}
      {current.step === 4 ? <PhoneStep onBack={leave} onNext={() => go(5)} phone={state.phone} /> : null}
      {current.step === 5 ? (
        <LegalStep
          key={current.part ?? 'start'}
          legalKind={legalKind}
          me={me.data}
          onBack={() => go(4)}
          onNext={() => go(6)}
          submission={state.submission}
          {...(current.part ? { startPart: current.part } : {})}
        />
      ) : null}
      {current.step === 6 ? <DocumentsStep me={me.data} onBack={() => go(5)} onNext={() => go(7)} state={state} /> : null}
      {current.step === 7 ? <ReviewStep me={me.data} onBack={() => go(6)} onEdit={go} onSubmitted={setResult} state={state} /> : null}
    </ScrollScreen>
  );
}
