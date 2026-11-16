import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { z } from 'zod';
import { emailVerifyConfirmResponseSchema } from '@gymsheet/schemas';
import { apiClient } from '@/api/client';
import { resolveError } from '@/notifications';
import { useAuthStore } from '@/state/auth-store';
import {
  PIN_LENGTH,
  RESEND_COOLDOWN_SECONDS,
  cooldownFromError,
  needsNewPin,
  pinErrorMessage,
  sanitizePin,
} from './email-verification-logic';

const emailVerificationService = {
  request: () => apiClient.request('/auth/email/verify/request', z.unknown(), { method: 'POST' }),
  confirm: (pin: string) =>
    apiClient.request('/auth/email/verify/confirm', emailVerifyConfirmResponseSchema, {
      method: 'POST',
      body: { pin },
    }),
};

/** Ticks a whole-second countdown down to zero. */
function useCountdown(): [number, (seconds: number) => void] {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setTimeout(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);
  return [seconds, setSeconds];
}

function messageOf(error: unknown): string {
  return pinErrorMessage(error) ?? resolveError(error).message;
}

/**
 * The PIN flow. Signup already sent the first code, so nothing is requested on
 * open: «Reenviar código» asks for another, and a 429 sets the real wait.
 * Errors stay inline next to the field (no toast): it is where the eye already is.
 */
export function useEmailVerification() {
  const queryClient = useQueryClient();
  const emailVerified = useAuthStore((state) => state.emailVerified);
  const setEmailVerified = useAuthStore((state) => state.setEmailVerified);
  const refreshAccount = useAuthStore((state) => state.refreshAccount);
  const [pin, setPinValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [cooldown, setCooldown] = useCountdown();

  const confirm = useMutation({
    mutationFn: emailVerificationService.confirm,
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      setEmailVerified(true);
      // Social screens that answered 403 refetch now; `/auth/me` confirms the
      // flag. Not awaited: the success state must not wait for every refetch.
      void queryClient.invalidateQueries();
      void refreshAccount().catch(() => undefined);
    },
    onError: (failure) => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
      setError(messageOf(failure));
      if (needsNewPin(failure)) setPinValue('');
    },
  });

  const resend = useMutation({
    mutationFn: emailVerificationService.request,
    onMutate: () => {
      setError(null);
      setNotice(null);
    },
    onSuccess: () => {
      setPinValue('');
      setNotice('Te enviamos un código nuevo.');
      setCooldown(RESEND_COOLDOWN_SECONDS);
    },
    onError: (failure) => {
      const wait = cooldownFromError(failure);
      if (wait !== null) setCooldown(wait);
      setError(messageOf(failure));
    },
  });

  const setPin = (text: string) => {
    const next = sanitizePin(text);
    setPinValue(next);
    if (error) setError(null);
    // A pasted or autofilled code submits itself: one less tap.
    if (next.length === PIN_LENGTH && !confirm.isPending) confirm.mutate(next);
  };

  return {
    verified: emailVerified === true || confirm.isSuccess,
    pin,
    setPin,
    submit: () => confirm.mutate(pin),
    canSubmit: pin.length === PIN_LENGTH && !confirm.isPending,
    confirming: confirm.isPending,
    resend: () => resend.mutate(),
    resending: resend.isPending,
    cooldown,
    error,
    notice,
  };
}
