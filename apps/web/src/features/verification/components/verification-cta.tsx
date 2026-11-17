'use client';

import { offersVerificationCta, verificationCopy } from '@gymsheet/domain';
import { BadgeCheck } from 'lucide-react';
import { Button, ButtonLink } from '@/shared/components/ui/button';
import { useMyVerification } from '../hooks/use-verification-flow';
import { dismissVerificationCta, useVerificationCtaDismissed } from '../lib/cta-dismissal';

/**
 * «Verifícate para aparecer antes», in Conocer and the own profile. Only for
 * members, only while there is something to do (never verified, not in
 * review), and gone for the session after «Ahora no». While the status loads
 * or fails it renders nothing: it is a nudge, never a gate.
 */
export function VerificationCta({ enabled = true }: Readonly<{ enabled?: boolean }>) {
  const dismissed = useVerificationCtaDismissed();
  const status = useMyVerification(enabled && !dismissed);
  if (!enabled || dismissed || !offersVerificationCta(status.data?.status)) return null;

  return (
    <section
      aria-labelledby="verification-cta-title"
      className="panel flex flex-wrap items-center gap-4 px-5 py-4"
      data-testid="verification-cta"
    >
      <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--info-bg)] text-[var(--info-text)]">
        <BadgeCheck className="size-5" />
      </span>
      <div className="grid min-w-0 flex-1 basis-56 gap-0.5">
        <h2 className="t-headline" id="verification-cta-title">
          {verificationCopy.ctaTitle}
        </h2>
        <p className="t-subhead text-[var(--text-muted)]">{verificationCopy.ctaWhy}</p>
      </div>
      <div className="flex gap-2">
        <ButtonLink href="/verificacion" size="sm">
          {verificationCopy.ctaAction}
        </ButtonLink>
        <Button onClick={dismissVerificationCta} size="sm" type="button" variant="ghost">
          {verificationCopy.ctaDismiss}
        </Button>
      </div>
    </section>
  );
}
