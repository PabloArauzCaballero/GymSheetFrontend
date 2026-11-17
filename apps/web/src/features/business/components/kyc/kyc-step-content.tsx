'use client';

import type { BusinessWizardStep, KycLegalPart } from '@gymsheet/domain';
import type { KycState, KycSubmitResult } from '@/shared/api/schemas';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { useBusinessMe, useKycState } from '../../hooks/use-kyc';
import { KycDocumentsStep } from './kyc-documents-step';
import { KycLegalStep } from './kyc-legal-step';
import { KycPhoneStep } from './kyc-phone-step';
import { KycReviewStep } from './kyc-review-step';

export type KycGo = (step: BusinessWizardStep, part?: KycLegalPart, notice?: string) => void;

/**
 * Steps 4–7 of the business wizard (franja 8b). Reads `GET /business/me/kyc`
 * (seeded by the server page) and `GET /business/me`; each step writes to the
 * server before moving on, so leaving and coming back resumes at the same place.
 */
export function KycStepContent({
  step,
  part,
  initial,
  go,
  onSubmitted,
}: Readonly<{
  step: 4 | 5 | 6 | 7;
  part?: KycLegalPart;
  initial?: KycState | null;
  go: KycGo;
  onSubmitted: (result: KycSubmitResult) => void;
}>) {
  const kyc = useKycState(initial);
  const me = useBusinessMe();

  if (kyc.isPending) {
    return <div aria-busy className="h-72 animate-pulse rounded-[var(--radius-lg)] bg-[var(--surface)] motion-reduce:animate-none" />;
  }
  if (kyc.isError) return <ErrorPanel error={kyc.error} message={kyc.error.message} onRetry={() => void kyc.refetch()} />;
  const state = kyc.data;
  const legalKind = state.submission?.legalKind ?? me.data?.account.legalKind ?? 'COMPANY';

  if (step === 4) return <KycPhoneStep onBack={() => go(3)} onNext={() => go(5)} phone={state.phone} />;
  if (step === 5) {
    return (
      <KycLegalStep
        key={part ?? 'start'}
        legalKind={legalKind}
        me={me.data}
        onBack={() => go(4)}
        onNext={() => go(6)}
        submission={state.submission}
        {...(part ? { startPart: part } : {})}
      />
    );
  }
  if (step === 6) return <KycDocumentsStep me={me.data} onBack={() => go(5)} onNext={() => go(7)} state={state} />;
  return <KycReviewStep me={me.data} onBack={() => go(6)} onEdit={go} onSubmitted={onSubmitted} state={state} />;
}
