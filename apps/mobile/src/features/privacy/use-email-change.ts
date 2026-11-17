import { useMutation } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { emailChangeCopy } from '@gymsheet/domain';
import {
  acceptedResponseSchema,
  emailChangeConfirmResponseSchema,
  emailChangeRequestSchema,
  type EmailChangeRequestInput,
} from '@gymsheet/schemas';
import { apiClient } from '@/api/client';
import { sanitizePin, PIN_LENGTH } from '@/features/email-verification/email-verification-logic';
import { notify } from '@/notifications';
import { useAuthStore } from '@/state/auth-store';
import { emailChangeFailure, type FormFailure } from './account-logic';

const emailChangeService = {
  request: (input: EmailChangeRequestInput) =>
    apiClient.request('/me/email/change', acceptedResponseSchema, { method: 'POST', body: input }),
  confirm: (pin: string) =>
    apiClient.request('/me/email/change/confirm', emailChangeConfirmResponseSchema, { method: 'POST', body: { pin } }),
};

/**
 * «Cambiar correo»: the new address and the current password, then the PIN
 * sent to the new address. The session's email changes only once the PIN is
 * confirmed; until then the old one keeps working.
 */
export function useEmailChange() {
  const router = useRouter();
  const refreshAccount = useAuthStore((state) => state.refreshAccount);
  const setEmailVerified = useAuthStore((state) => state.setEmailVerified);
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPinValue] = useState('');
  const [step, setStep] = useState<'request' | 'confirm'>('request');
  const [failure, setFailure] = useState<FormFailure | null>(null);

  const request = useMutation({
    mutationFn: emailChangeService.request,
    onSuccess: () => {
      setFailure(null);
      setPinValue('');
      setStep('confirm');
    },
    onError: (error) => setFailure(emailChangeFailure(error)),
  });

  const confirm = useMutation({
    mutationFn: emailChangeService.confirm,
    onSuccess: async (result) => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEmailVerified(true);
      await refreshAccount().catch(() => undefined);
      notify.success(emailChangeCopy.changed(result.email));
      router.back();
    },
    onError: (error) => {
      setFailure(emailChangeFailure(error));
      setPinValue('');
    },
  });

  const send = () => {
    const parsed = emailChangeRequestSchema.safeParse({ newEmail, password });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return setFailure({ field: issue?.path[0] === 'password' ? 'password' : 'email', message: issue?.message ?? '' });
    }
    request.mutate(parsed.data);
  };

  const setPin = (text: string) => {
    const digits = sanitizePin(text);
    setPinValue(digits);
    if (failure?.field === 'pin') setFailure(null);
    if (digits.length === PIN_LENGTH && !confirm.isPending) confirm.mutate(digits);
  };

  return {
    step,
    newEmail,
    setNewEmail: (text: string) => {
      setNewEmail(text);
      if (failure?.field === 'email') setFailure(null);
    },
    password,
    setPassword: (text: string) => {
      setPassword(text);
      if (failure?.field === 'password') setFailure(null);
    },
    pin,
    setPin,
    failure,
    send,
    resend: send,
    sending: request.isPending,
    confirming: confirm.isPending,
    back: () => {
      setStep('request');
      setFailure(null);
    },
  };
}
