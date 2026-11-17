'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  businessKindProblem,
  businessWizardCopy,
  kycOutcomeFromSubmit,
  type BusinessWizardStep,
  type KycLegalPart,
} from '@gymsheet/domain';
import type { BusinessProfileForm, EntityType, KycState, KycSubmitResult } from '@/shared/api/schemas';
import { EmailVerificationForm } from '@/features/account-security/components/email-verification-form';
import { logout } from '@/features/auth/services/auth-client';
import { Button } from '@/shared/components/ui/button';
import { BusinessAccountStep } from './business-account-step';
import { BusinessFrame } from './business-frame';
import { BusinessProfileStep } from './business-profile-step';
import { BusinessTypeStep, type BusinessKind } from './business-type-step';
import { KycResultView } from './kyc/kyc-result-view';
import { KycStepContent, type KycGo } from './kyc/kyc-step-content';

export type BusinessWizardStart = {
  step: BusinessWizardStep;
  /** Known once the account exists (resumed from `GET /business/me`). */
  email?: string;
  entityType?: EntityType;
  profile?: Partial<BusinessProfileForm>;
  /** Steps 4–7: the KYC state read by the server page, and the legal part to open. */
  kyc?: KycState | null;
  part?: KycLegalPart;
};

/**
 * Business signup in eight steps: the account (0–3, franja 8a: «¿Qué eres?» →
 * «Tu cuenta» → «Verifica tu correo» → «Tu negocio») and the KYC (4–7, franja
 * 8b: teléfono → datos legales → documentos → revisa y envía) ending on the
 * result. Steps 0–1 run without a session; from step 2 the account exists, so
 * a signed-in business resumes where the server says (the page decides
 * `start`). Once created, there is no way back to steps 0–1.
 */
export function BusinessSignupWizard({ start }: Readonly<{ start: BusinessWizardStart }>) {
  const router = useRouter();
  const [step, setStep] = useState<BusinessWizardStep>(start.step);
  const [kind, setKind] = useState<BusinessKind>({ type: start.entityType ?? null, legalKind: null });
  const [kindError, setKindError] = useState<string | null>(null);
  const [email, setEmail] = useState(start.email ?? '');
  const [profile, setProfile] = useState<Partial<BusinessProfileForm>>(start.profile ?? {});
  const [part, setPart] = useState<KycLegalPart | undefined>(start.part);
  const [notice, setNotice] = useState<string | null>(null);
  const [result, setResult] = useState<KycSubmitResult | null>(null);
  const copy = businessWizardCopy.steps[step];
  const outcome = result ? kycOutcomeFromSubmit(result) : null;

  const go: KycGo = (next, nextPart, message) => {
    setPart(nextPart);
    setNotice(message ?? null);
    setStep(next);
  };

  async function leave() {
    await logout().catch(() => undefined);
    router.replace('/login');
    router.refresh();
  }

  const footer =
    step < 2 ? (
      <p className="text-[var(--text-muted)]">
        <Link className="font-semibold text-[var(--text)] underline decoration-[var(--volt)] underline-offset-4" href="/login">
          {businessWizardCopy.signIn}
        </Link>{' '}
        {businessWizardCopy.signInSuffix}
      </p>
    ) : (
      <Button onClick={() => void leave()} size="sm" type="button" variant="ghost">
        {businessWizardCopy.logout}
      </Button>
    );

  return (
    <BusinessFrame
      description={outcome ? undefined : copy.description}
      footer={footer}
      progress={outcome ? undefined : businessWizardCopy.progress(step)}
      title={outcome ? outcome.title : copy.title}
    >
      {notice && !outcome ? (
        <p className="t-subhead rounded-[var(--radius-md)] bg-[var(--warning-bg)] px-4 py-3 text-[var(--warning-text)]" role="status">
          {notice}
        </p>
      ) : null}
      {step === 0 ? (
        <BusinessTypeStep
          error={kindError}
          onChange={(value) => {
            setKind(value);
            setKindError(null);
          }}
          onNext={() => {
            const problem = businessKindProblem(kind.type, kind.legalKind);
            setKindError(problem);
            if (!problem) setStep(1);
          }}
          value={kind}
        />
      ) : null}
      {step === 1 ? (
        <BusinessAccountStep
          kind={kind}
          onBack={() => setStep(0)}
          onCreated={(created) => {
            setEmail(created.email);
            setProfile({ name: created.businessName });
            setKind({ type: created.business.entityType, legalKind: created.business.legalKind });
            setStep(2);
          }}
        />
      ) : null}
      {step === 2 ? <EmailVerificationForm email={email} onVerified={() => setStep(3)} /> : null}
      {step === 3 && kind.type ? (
        <BusinessProfileStep entityType={kind.type} initial={profile} onSaved={() => go(4)} />
      ) : null}
      {outcome ? <KycResultView outcome={outcome} /> : null}
      {!outcome && step >= 4 ? (
        <KycStepContent
          go={go}
          initial={start.kyc ?? null}
          // No refresh: the page would now redirect to /negocio/verificacion and lose this answer.
          onSubmitted={setResult}
          step={step as 4 | 5 | 6 | 7}
          {...(part ? { part } : {})}
        />
      ) : null}
    </BusinessFrame>
  );
}

