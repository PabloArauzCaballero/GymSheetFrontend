'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  businessDestination,
  businessKindProblem,
  businessWizardCopy,
  type BusinessWizardStep,
} from '@gymsheet/domain';
import type { BusinessProfileForm, EntityType } from '@/shared/api/schemas';
import { EmailVerificationForm } from '@/features/account-security/components/email-verification-form';
import { logout } from '@/features/auth/services/auth-client';
import { Button } from '@/shared/components/ui/button';
import { BusinessAccountStep } from './business-account-step';
import { BusinessFrame } from './business-frame';
import { BusinessProfileStep } from './business-profile-step';
import { BusinessTypeStep, type BusinessKind } from './business-type-step';

export type BusinessWizardStart = {
  step: BusinessWizardStep;
  /** Known once the account exists (resumed from `GET /business/me`). */
  email?: string;
  entityType?: EntityType;
  profile?: Partial<BusinessProfileForm>;
};

/**
 * Business signup, steps 0–3 of franja 8a: «¿Qué eres?» → «Tu cuenta» →
 * «Verifica tu correo» → «Tu negocio». Steps 0–1 run without a session; from
 * step 2 the account exists, so a signed-in business resumes where
 * `nextSteps` says (the page decides `start`). Once created, there is no way
 * back to steps 0–1: the account cannot be un-created from here.
 */
export function BusinessSignupWizard({ start }: Readonly<{ start: BusinessWizardStart }>) {
  const router = useRouter();
  const [step, setStep] = useState<BusinessWizardStep>(start.step);
  const [kind, setKind] = useState<BusinessKind>({ type: start.entityType ?? null, legalKind: null });
  const [kindError, setKindError] = useState<string | null>(null);
  const [email, setEmail] = useState(start.email ?? '');
  const [profile, setProfile] = useState<Partial<BusinessProfileForm>>(start.profile ?? {});
  const copy = businessWizardCopy.steps[step];

  function enterPortal() {
    router.replace(businessDestination.web.home);
    router.refresh();
  }

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
    <BusinessFrame description={copy.description} footer={footer} progress={businessWizardCopy.progress(step)} title={copy.title}>
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
        <BusinessProfileStep entityType={kind.type} initial={profile} onSaved={enterPortal} />
      ) : null}
    </BusinessFrame>
  );
}

