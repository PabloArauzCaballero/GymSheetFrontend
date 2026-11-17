'use client';

import { useMutation } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import { formatCountdown, gestureGlyph, kycCopy, kycFailure } from '@gymsheet/domain';
import { withSelfieChallenge, withSelfieConsent } from '@/shared/api/query-keys';
import type { KycSelfieChallenge, KycState } from '@/shared/api/schemas';
import { Button } from '@/shared/components/ui/button';
import { useCountdown } from '@/features/verification/hooks/use-countdown';
import { useKycCache } from '../../hooks/use-kyc';
import { businessKycService } from '../../services/business-kyc-client';

/** Whether the selfie can be uploaded now: consent up to date and a gesture still open. */
export function useSelfieReady(consent: KycState['consent'], challenge: KycSelfieChallenge | null): boolean {
  const seconds = useCountdown(challenge?.expiresAt ?? null);
  return consent.upToDate && Boolean(challenge) && seconds > 0;
}

/**
 * What comes before the selfie (ADR-0014 pattern, `KYC_SELFIE`): the consent
 * with its purpose, right before the photo; then a one-use gesture with its
 * deadline. Renders nothing more once a gesture is open: the slot uploads.
 */
export function KycSelfieGate({
  consent,
  challenge,
}: Readonly<{ consent: KycState['consent']; challenge: KycSelfieChallenge | null }>) {
  const cache = useKycCache();
  const seconds = useCountdown(challenge?.expiresAt ?? null);
  const open = Boolean(challenge) && seconds > 0;
  const grant = useMutation({
    mutationFn: () => businessKycService.grantSelfieConsent(consent.currentVersion),
    onSuccess: () => cache(withSelfieConsent),
  });
  const ask = useMutation({
    mutationFn: businessKycService.selfieChallenge,
    onSuccess: (next) => cache((state) => withSelfieChallenge(state, next)),
  });
  const failure = grant.error ?? ask.error;

  if (!consent.upToDate) {
    return (
      <div className="grid gap-3 rounded-[var(--radius-md)] bg-[var(--surface-high)] p-4">
        <p className="flex items-center gap-2 font-semibold">
          <ShieldCheck aria-hidden className="size-4 shrink-0" />
          {kycCopy.documents.consentTitle}
        </p>
        <p className="t-subhead text-[var(--text-muted)]">{kycCopy.documents.consentBody}</p>
        {failure ? <p className="text-sm text-[var(--danger)]" role="alert">{kycFailure(failure).message}</p> : null}
        <Button className="justify-self-start" loading={grant.isPending} onClick={() => grant.mutate()} size="sm" type="button" variant="secondary">
          {kycCopy.documents.consentAccept}
        </Button>
      </div>
    );
  }

  if (!open) {
    return (
      <div className="grid gap-2">
        {challenge ? <p className="t-subhead text-[var(--text-muted)]">{kycCopy.documents.gestureExpired}</p> : null}
        {failure ? <p className="text-sm text-[var(--danger)]" role="alert">{kycFailure(failure).message}</p> : null}
        <Button className="justify-self-start" loading={ask.isPending} onClick={() => ask.mutate()} size="sm" type="button" variant="secondary">
          {kycCopy.documents.gestureAsk}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-[var(--radius-md)] bg-[var(--surface-high)] p-3" data-testid="kyc-gesture">
      <span aria-hidden className="text-3xl leading-none">
        {gestureGlyph(challenge!)}
      </span>
      <div className="grid gap-0.5">
        <p className="font-semibold">
          <span className="sr-only">{kycCopy.documents.gestureTitle}: </span>
          {challenge!.instruction}
        </p>
        <p className="t-footnote tabular-nums text-[var(--text-muted)]" aria-live="off">
          {kycCopy.documents.gestureLeft(formatCountdown(seconds))}
        </p>
      </div>
    </div>
  );
}
