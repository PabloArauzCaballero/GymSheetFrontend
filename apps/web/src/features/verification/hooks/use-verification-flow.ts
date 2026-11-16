'use client';

import { verificationCopy, verificationErrorKind, verificationErrorMessage } from '@gymsheet/domain';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import type { MyVerification, VerificationChallenge } from '@/shared/api/schemas';
import { queryKeys } from '@/shared/api/query-keys';
import { notify } from '@/shared/notifications';
import { useConsentGate } from '@/features/privacy/hooks/use-consent-gate';
import { verificationService } from '../services/verification-service';

const KIND = 'VERIFICATION_SELFIE' as const;

export function useMyVerification(enabled = true) {
  return useQuery({ queryKey: queryKeys.verification, queryFn: verificationService.mine, enabled, retry: false });
}

/**
 * Member flow: consent → challenge → selfie → pending review.
 *
 * The VERIFICATION_SELFIE consent is asked (with its purpose) before any
 * challenge exists, so the camera never opens without it. A 400
 * CONSENT_REQUIRED on the challenge or the upload asks again and retries once.
 */
export function useVerificationFlow() {
  const queryClient = useQueryClient();
  const gate = useConsentGate();
  const status = useMyVerification();
  const [requested, setRequested] = useState<VerificationChallenge | null>(null);
  const [expiredId, setExpiredId] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [busy, setBusy] = useState<'start' | 'upload' | null>(null);

  // A reload resumes the open challenge the server still holds.
  const challenge = requested ?? (status.data?.status === 'PENDING_UPLOAD' ? status.data.challenge : null);

  const fail = useCallback(
    (error: unknown) => {
      const kind = verificationErrorKind(error);
      if (kind === 'unavailable') return setUnavailable(true);
      if (kind === 'expired' && challenge) return setExpiredId(challenge.id);
      if (kind !== 'other' && kind !== 'consent') void queryClient.invalidateQueries({ queryKey: queryKeys.verification });
      const message = verificationErrorMessage(kind);
      if (message) notify.warning(message);
      else notify.error(error);
    },
    [challenge, queryClient],
  );

  const start = useCallback(async () => {
    setBusy('start');
    try {
      if (!(await gate.ensure(KIND))) {
        notify.info(verificationCopy.consentDeclined);
        return;
      }
      const next = await gate.withConsent(verificationService.challenge);
      setExpiredId(null);
      setRequested(next);
    } catch (error: unknown) {
      fail(error);
    } finally {
      setBusy(null);
    }
  }, [fail, gate]);

  const upload = useCallback(
    async (selfie: Blob, fileName?: string) => {
      if (!challenge) return false;
      setBusy('upload');
      try {
        const submitted = await gate.withConsent(() => verificationService.uploadSelfie(challenge.id, selfie, fileName));
        setRequested(null);
        queryClient.setQueryData<MyVerification>(queryKeys.verification, (current) =>
          current ? { ...current, status: submitted.status, challenge: null } : current,
        );
        void queryClient.invalidateQueries({ queryKey: queryKeys.verification });
        return true;
      } catch (error: unknown) {
        fail(error);
        return false;
      } finally {
        setBusy(null);
      }
    },
    [challenge, fail, gate, queryClient],
  );

  return {
    status,
    challenge,
    /** The deadline passed on the client clock or the server said so (409). */
    expiredByServer: Boolean(challenge && expiredId === challenge.id),
    unavailable,
    busy,
    start,
    upload,
  };
}
