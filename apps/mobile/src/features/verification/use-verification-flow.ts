import { secondsLeft, verificationCopy, verificationErrorKind, verificationErrorMessage } from '@gymsheet/domain';
import type { MyVerification, VerificationChallenge } from '@gymsheet/schemas';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useState } from 'react';
import { notify } from '@/notifications';
import { useConsentGate } from '@/features/consents/ask-consent';
import { activeChallenge, selfieFromAsset, verificationStep, type LocalSelfie } from './verification-logic';
import { verificationQueryKey, verificationService } from './verification-service';

export function useMyVerification(enabled = true) {
  return useQuery({ queryKey: verificationQueryKey, queryFn: verificationService.mine, enabled, retry: false });
}

function useSecondsLeft(expiresAt: string | null): number {
  const [now, setNow] = useState(() => Date.now());
  const left = expiresAt ? secondsLeft(expiresAt, now) : 0;
  const done = left === 0;
  useEffect(() => {
    if (!expiresAt || done) return undefined;
    const tick = () => setNow(Date.now());
    // Re-read the clock at once: `now` may predate this deadline (idle screen, previous gesture).
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [expiresAt, done]);
  return left;
}

/**
 * Consent (with its purpose) → challenge with deadline → front camera →
 * preview → upload → in review. The camera is only reachable once a challenge
 * exists, and a challenge only after the VERIFICATION_SELFIE consent.
 */
export function useVerificationFlow() {
  const queryClient = useQueryClient();
  const gate = useConsentGate();
  const status = useMyVerification();
  const [requested, setRequested] = useState<VerificationChallenge | null>(null);
  const [expiredId, setExpiredId] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [shot, setShot] = useState<LocalSelfie | null>(null);
  const [busy, setBusy] = useState<'start' | 'camera' | 'upload' | null>(null);
  const challenge = activeChallenge(requested, status.data);
  const seconds = useSecondsLeft(challenge?.expiresAt ?? null);

  const fail = (error: unknown) => {
    const kind = verificationErrorKind(error);
    if (kind === 'unavailable') return setUnavailable(true);
    if (kind === 'expired' && challenge) return setExpiredId(challenge.id);
    if (kind !== 'other' && kind !== 'consent') void queryClient.invalidateQueries({ queryKey: verificationQueryKey });
    const message = verificationErrorMessage(kind);
    if (message) notify.warning(message);
    else notify.error(error);
  };

  const start = async () => {
    setBusy('start');
    try {
      if (!(await gate.ensure('VERIFICATION_SELFIE'))) return notify.info(verificationCopy.consentDeclined);
      const result = await gate.withConsent(verificationService.challenge);
      if (!result.done) return notify.info(verificationCopy.consentDeclined);
      setShot(null);
      setExpiredId(null);
      setRequested(result.value);
    } catch (error) {
      fail(error);
    } finally {
      setBusy(null);
    }
  };

  const capture = useCallback(async () => {
    setBusy('camera');
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) return notify.warning('Necesitas dar permiso para usar la cámara.');
      const result = await ImagePicker.launchCameraAsync({
        cameraType: ImagePicker.CameraType.front,
        mediaTypes: ['images'],
        quality: 0.85,
        allowsEditing: false,
        exif: false,
      });
      const asset = result.canceled ? null : result.assets[0];
      if (!asset) return undefined;
      const selfie = selfieFromAsset(asset);
      if ('error' in selfie) return notify.warning(selfie.error);
      setShot(selfie);
    } finally {
      setBusy(null);
    }
    return undefined;
  }, []);

  const upload = async () => {
    if (!challenge || !shot) return;
    setBusy('upload');
    try {
      const result = await gate.withConsent(() => verificationService.uploadSelfie(challenge.id, shot));
      if (!result.done) return notify.info(verificationCopy.consentDeclined);
      setRequested(null);
      setShot(null);
      queryClient.setQueryData<MyVerification>(verificationQueryKey, (current) =>
        current ? { ...current, status: result.value.status, challenge: null } : current,
      );
      void queryClient.invalidateQueries({ queryKey: verificationQueryKey });
    } catch (error) {
      fail(error);
    } finally {
      setBusy(null);
    }
  };

  const step = verificationStep({
    status: status.data,
    failed: status.isError,
    challenge,
    secondsLeft: seconds,
    expiredByServer: Boolean(challenge && expiredId === challenge.id),
    unavailable,
  });

  return { status, step, challenge, seconds, shot, busy, start, capture, retake: () => setShot(null), upload };
}
