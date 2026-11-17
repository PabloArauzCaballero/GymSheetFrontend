'use client';

import { authCopy, kycErasureCopy, kycErasureFailure } from '@gymsheet/domain';
import { useMutation } from '@tanstack/react-query';
import { ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { kycEraseInputSchema } from '@/shared/api/schemas';
import { Button } from '@/shared/components/ui/button';
import { Field } from '@/shared/components/ui/field';
import { PasswordInput } from '@/shared/components/ui/input';
import { confirm } from '@/shared/notifications';
import { businessKycService } from '@/features/business/services/business-kyc-client';

/**
 * «Borrar mis documentos de verificación» (ADR-0028 §7): what is erased and
 * what it costs (the business is suspended until a new KYC) first, then the
 * password, then a second confirmation. The server pages re-read the account.
 */
export function KycErasure() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const erase = useMutation({
    mutationFn: (value: string) => businessKycService.erase(value),
    onSuccess: () => {
      setPassword('');
      router.refresh();
    },
    onError: (failure: Error) => setError(kycErasureFailure(failure).message),
  });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = kycEraseInputSchema.safeParse({ password });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? null);
    setError(null);
    const answer = await confirm({
      title: kycErasureCopy.confirmTitle,
      message: kycErasureCopy.confirmMessage,
      severity: 'danger',
      confirmLabel: kycErasureCopy.confirmLabel,
    });
    if (answer.confirmed) erase.mutate(parsed.data.password);
  }

  if (erase.isSuccess) {
    return (
      <p className="t-subhead font-semibold" role="status">
        {kycErasureCopy.done}
      </p>
    );
  }
  if (!open) {
    return (
      <div className="grid gap-3">
        <p className="t-subhead text-[var(--text-muted)]">{kycErasureCopy.description}</p>
        <Button className="justify-self-start" onClick={() => setOpen(true)} size="sm" variant="ghost">
          {kycErasureCopy.start}
        </Button>
      </div>
    );
  }
  return (
    <form className="grid gap-4" noValidate onSubmit={(event) => void submit(event)}>
      <div className="flex items-start gap-3 rounded-[var(--radius-lg)] bg-[var(--danger-bg)] p-4 text-[var(--danger-text)]">
        <ShieldAlert aria-hidden className="mt-0.5 size-5 shrink-0" />
        <p className="t-subhead font-semibold">{kycErasureCopy.consequence}</p>
      </div>
      <p className="t-subhead text-[var(--text-muted)]">{kycErasureCopy.description}</p>
      <p className="t-footnote text-[var(--text-muted)]">{kycErasureCopy.kept}</p>
      <Field error={error ?? undefined} htmlFor="kyc-erase-password" label={kycErasureCopy.passwordLabel}>
        <PasswordInput
          autoComplete="current-password"
          hideLabel={authCopy.hidePassword}
          name="password"
          onChange={(event) => setPassword(event.target.value)}
          showLabel={authCopy.showPassword}
          value={password}
        />
      </Field>
      <Button className="justify-self-start" loading={erase.isPending} size="sm" type="submit" variant="danger">
        {kycErasureCopy.submit}
      </Button>
    </form>
  );
}
