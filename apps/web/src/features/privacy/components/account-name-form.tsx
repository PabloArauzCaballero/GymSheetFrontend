'use client';

import { accountNameCopy } from '@gymsheet/domain';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { ApiError } from '@/shared/api/api-error';
import { updateAccountNameSchema } from '@/shared/api/schemas';
import { Button } from '@/shared/components/ui/button';
import { Field } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import { notify } from '@/shared/notifications';
import { privacyService } from '../services/privacy-service';

/** Name rectification. The session re-reads the account afterwards, so Ajustes shows the new name. */
export function AccountNameForm({ name }: Readonly<{ name?: string }>) {
  const router = useRouter();
  const [value, setValue] = useState(name ?? '');
  const [error, setError] = useState<string | null>(null);
  const rename = useMutation({
    mutationFn: (nombreCompleto: string) => privacyService.rename(nombreCompleto),
    onSuccess: () => {
      notify.success(accountNameCopy.saved);
      router.refresh();
    },
    onError: (failure: Error) =>
      setError(
        failure instanceof ApiError
          ? (failure.fieldErrors.nombreCompleto ?? failure.message)
          : failure.message,
      ),
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = updateAccountNameSchema.safeParse({ nombreCompleto: value });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? null);
    setError(null);
    rename.mutate(parsed.data.nombreCompleto);
  }

  return (
    <form className="grid gap-4" noValidate onSubmit={submit}>
      <Field error={error ?? undefined} htmlFor="account-name" label={accountNameCopy.label}>
        <Input
          autoComplete="name"
          maxLength={180}
          name="nombreCompleto"
          onChange={(event) => setValue(event.target.value)}
          value={value}
        />
      </Field>
      <Button className="justify-self-start" loading={rename.isPending} size="sm" type="submit" variant="secondary">
        {accountNameCopy.submit}
      </Button>
    </form>
  );
}
