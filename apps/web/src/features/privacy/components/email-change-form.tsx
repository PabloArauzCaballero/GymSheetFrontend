'use client';

import { authCopy, emailChangeCopy } from '@gymsheet/domain';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import {
  emailChangeConfirmSchema,
  emailChangeRequestSchema,
  type EmailChangeRequestInput,
} from '@/shared/api/schemas';
import { Button } from '@/shared/components/ui/button';
import { Field } from '@/shared/components/ui/field';
import { Input, PasswordInput } from '@/shared/components/ui/input';
import { emailChangeErrorMessage } from '../lib/account-errors';
import { privacyService } from '../services/privacy-service';
import { PinInput } from './pin-input';

/**
 * Two steps: the password authorizes the request and a PIN sent to the NEW
 * address proves it. The login address only changes on confirmation.
 */
export function EmailChangeForm() {
  const router = useRouter();
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const request = useMutation({
    mutationFn: (input: EmailChangeRequestInput) => privacyService.requestEmailChange(input),
    onSuccess: (_result, input) => {
      setError(null);
      setPassword('');
      setSentTo(input.newEmail);
    },
    onError: (failure: Error) => setError(emailChangeErrorMessage(failure)),
  });
  const confirmPin = useMutation({
    mutationFn: (pin: string) => privacyService.confirmEmailChange(pin),
    onSuccess: () => {
      setError(null);
      router.refresh();
    },
    onError: (failure: Error) => setError(emailChangeErrorMessage(failure)),
  });

  function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = emailChangeRequestSchema.safeParse({ newEmail, password });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? null);
    request.mutate(parsed.data);
  }

  function submitPin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = emailChangeConfirmSchema.safeParse({ pin });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? null);
    confirmPin.mutate(parsed.data.pin);
  }

  if (confirmPin.isSuccess) {
    return (
      <p className="t-subhead" role="status">
        {emailChangeCopy.changed(confirmPin.data.email)}
      </p>
    );
  }

  if (sentTo) {
    return (
      <form className="grid gap-4" noValidate onSubmit={submitPin}>
        <p className="t-subhead text-[var(--text-muted)]" role="status">
          {emailChangeCopy.pinSent(sentTo)}
        </p>
        <PinInput error={error} id="email-change-pin" label={emailChangeCopy.pinLabel} onChange={setPin} value={pin} />
        <div className="flex flex-wrap gap-2">
          <Button loading={confirmPin.isPending} size="sm" type="submit" variant="secondary">
            {emailChangeCopy.confirm}
          </Button>
          <Button
            onClick={() => {
              setSentTo(null);
              setPin('');
              setError(null);
            }}
            size="sm"
            type="button"
            variant="ghost"
          >
            {emailChangeCopy.restart}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form className="grid gap-4" noValidate onSubmit={submitRequest}>
      <p className="t-subhead text-[var(--text-muted)]">{emailChangeCopy.description}</p>
      <Field htmlFor="email-change-new" label={emailChangeCopy.newEmailLabel}>
        <Input
          autoComplete="email"
          inputMode="email"
          name="newEmail"
          onChange={(event) => setNewEmail(event.target.value)}
          spellCheck={false}
          type="email"
          value={newEmail}
        />
      </Field>
      <Field error={error ?? undefined} htmlFor="email-change-password" label={emailChangeCopy.passwordLabel}>
        <PasswordInput
          autoComplete="current-password"
          hideLabel={authCopy.hidePassword}
          name="password"
          onChange={(event) => setPassword(event.target.value)}
          showLabel={authCopy.showPassword}
          value={password}
        />
      </Field>
      <Button className="justify-self-start" loading={request.isPending} size="sm" type="submit" variant="secondary">
        {emailChangeCopy.request}
      </Button>
    </form>
  );
}
