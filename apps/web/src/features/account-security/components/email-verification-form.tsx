'use client';

import { emailVerificationCopy, pinCooldownSeconds } from '@gymsheet/domain';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CircleCheck, MailCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { EMAIL_PIN_COOLDOWN, emailPinSchema } from '@/shared/api/schemas';
import { ApiError } from '@/shared/api/api-error';
import { Button, ButtonLink } from '@/shared/components/ui/button';
import { Field } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import { useCountdown } from '../hooks/use-countdown';
import { needsNewPin, pinErrorMessage } from '../lib/pin-errors';
import { accountService } from '../services/account-client';

/**
 * The 6-digit PIN that proves the mailbox (signup already sent one). «Reenviar»
 * asks for another and counts down the seconds a 429 says to wait.
 */
export function EmailVerificationForm({
  email,
  verified: alreadyVerified = false,
  onVerified,
}: Readonly<{
  email: string;
  verified?: boolean;
  /**
   * Inside a flow that owns the title and the next step (the business signup):
   * no card or heading of its own, and success hands over instead of showing
   * «Ir a Comunidad».
   */
  onVerified?: () => void;
}>) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const cooldown = useCountdown();
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const confirm = useMutation({
    mutationFn: (pin: string) => accountService.confirmEmailPin(pin),
    onSuccess: async () => {
      setError(null);
      // The layout re-reads `/auth/me` (banner) and the social queries that answered 403 retry.
      router.refresh();
      await queryClient.invalidateQueries();
      onVerified?.();
    },
    onError: (failure: Error) => {
      setError(pinErrorMessage(failure));
      if (needsNewPin(failure)) setPin('');
    },
  });

  const resend = useMutation({
    mutationFn: () => accountService.requestEmailPin(),
    onSuccess: () => {
      setError(null);
      setNotice(`Te enviamos un código nuevo a ${email}.`);
    },
    onError: (failure: Error) => {
      setNotice(null);
      const seconds =
        failure instanceof ApiError && failure.code === EMAIL_PIN_COOLDOWN
          ? pinCooldownSeconds(failure.details)
          : null;
      if (seconds) cooldown.start(seconds);
      setError(pinErrorMessage(failure));
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = emailPinSchema.safeParse({ pin });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'El código son seis dígitos.');
      return;
    }
    setNotice(null);
    confirm.mutate(parsed.data.pin);
  }

  if ((alreadyVerified || confirm.isSuccess) && !onVerified) {
    return (
      <section
        className="panel grid justify-items-center gap-3 px-6 py-10 text-center"
        role="status"
      >
        <CircleCheck aria-hidden className="size-10 text-[var(--success)]" />
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">
          {emailVerificationCopy.verified}
        </h1>
        <ButtonLink className="mt-2" href="/comunidad" variant="primary">
          Ir a Comunidad
        </ButtonLink>
      </section>
    );
  }

  return (
    <form className={onVerified ? 'grid gap-6' : 'panel grid gap-6 px-6 py-8 sm:px-8'} noValidate onSubmit={submit}>
      {onVerified ? (
        <p className="t-subhead break-all font-medium">{email}</p>
      ) : (
        <header className="grid justify-items-center gap-2 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-[var(--surface-highest)]">
            <MailCheck aria-hidden className="size-7 text-[var(--accent-ink)]" />
          </span>
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">{emailVerificationCopy.title}</h1>
          <p className="t-subhead max-w-sm text-[var(--text-muted)]">
            {emailVerificationCopy.description}
          </p>
          <p className="t-subhead break-all font-medium">{email}</p>
        </header>
      )}

      <Field error={error ?? undefined} htmlFor="email-pin" label={emailVerificationCopy.pinLabel}>
        <Input
          autoComplete="one-time-code"
          className="h-14 text-center text-2xl font-semibold tabular-nums tracking-[0.5em]"
          id="email-pin"
          inputMode="numeric"
          maxLength={6}
          name="pin"
          onChange={(event) => setPin(event.target.value.replace(/\D/gu, '').slice(0, 6))}
          pattern="[0-9]*"
          spellCheck={false}
          value={pin}
        />
      </Field>

      {notice ? (
        <p className="t-subhead text-center text-[var(--text-muted)]" role="status">
          {notice}
        </p>
      ) : null}

      <div className="grid gap-3">
        <Button
          className="w-full"
          loading={confirm.isPending}
          size="lg"
          type="submit"
          variant="primary"
        >
          {emailVerificationCopy.submit}
        </Button>
        <Button
          className="w-full tabular-nums"
          disabled={cooldown.remaining > 0}
          loading={resend.isPending}
          onClick={() => resend.mutate()}
          type="button"
          variant="ghost"
        >
          {cooldown.remaining > 0
            ? emailVerificationCopy.resendIn(cooldown.remaining)
            : emailVerificationCopy.resend}
        </Button>
      </div>
    </form>
  );
}
