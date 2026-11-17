'use client';

import { accountClosureCopy, authCopy } from '@gymsheet/domain';
import { useState, type FormEvent } from 'react';
import { closeAccountInputSchema, type CloseAccountInput } from '@/shared/api/schemas';
import { Button } from '@/shared/components/ui/button';
import { Field } from '@/shared/components/ui/field';
import { PasswordInput } from '@/shared/components/ui/input';
import { Segmented } from '@/shared/components/ui/segmented';
import { PinInput } from './pin-input';

type Proof = 'password' | 'pin';

/** The proof that closes the account: the password, or an emailed PIN for Google/Apple accounts. */
export function ClosureProofForm({
  proofs,
  error,
  closing,
  pinSent,
  sendingPin,
  onSendPin,
  onSubmit,
}: Readonly<{
  proofs: readonly Proof[];
  error: string | null;
  closing: boolean;
  pinSent: boolean;
  sendingPin: boolean;
  onSendPin: () => void;
  onSubmit: (input: CloseAccountInput) => void;
}>) {
  const [proof, setProof] = useState<Proof>(proofs[0] ?? 'password');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = closeAccountInputSchema.safeParse(proof === 'password' ? { password } : { pin });
    if (!parsed.success) return setLocalError(parsed.error.issues[0]?.message ?? null);
    setLocalError(null);
    onSubmit(parsed.data);
  }

  const shown = localError ?? error;
  return (
    <form className="grid gap-4" noValidate onSubmit={submit}>
      <h4 className="t-headline">{accountClosureCopy.proofTitle}</h4>
      {proofs.length > 1 ? (
        <Segmented
          label={accountClosureCopy.proofTitle}
          onChange={(next) => {
            setProof(next);
            setLocalError(null);
          }}
          options={[
            { value: 'password', label: accountClosureCopy.proofPassword },
            { value: 'pin', label: accountClosureCopy.proofPin },
          ]}
          value={proof}
        />
      ) : null}
      {proof === 'password' ? (
        <Field error={shown ?? undefined} htmlFor="closure-password" label={accountClosureCopy.passwordLabel}>
          <PasswordInput
            autoComplete="current-password"
            hideLabel={authCopy.hidePassword}
            name="password"
            onChange={(event) => setPassword(event.target.value)}
            showLabel={authCopy.showPassword}
            value={password}
          />
        </Field>
      ) : (
        <div className="grid gap-3">
          {pinSent ? (
            <p className="t-subhead text-[var(--text-muted)]" role="status">
              {accountClosureCopy.pinSent}
            </p>
          ) : null}
          <Button className="justify-self-start" loading={sendingPin} onClick={onSendPin} size="sm" type="button" variant="ghost">
            {accountClosureCopy.sendPin}
          </Button>
          <PinInput error={shown} id="closure-pin" label={accountClosureCopy.pinLabel} onChange={setPin} value={pin} />
        </div>
      )}
      <Button className="justify-self-start" loading={closing} size="sm" type="submit" variant="danger">
        {accountClosureCopy.submit}
      </Button>
    </form>
  );
}
