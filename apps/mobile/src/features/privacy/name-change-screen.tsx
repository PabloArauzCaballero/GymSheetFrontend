import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { z } from 'zod';
import { ApiError } from '@gymsheet/api-client';
import { accountNameCopy } from '@gymsheet/domain';
import { updateAccountNameSchema } from '@gymsheet/schemas';
import { apiClient } from '@/api/client';
import { AuthAlert } from '@/components/auth-shell';
import { Card, ScrollScreen, ScreenHeader } from '@/components/layout';
import { BackLink } from '@/components/nav';
import { Button, Input } from '@/components/ui';
import { notify, resolveError } from '@/notifications';
import { useAuthStore } from '@/state/auth-store';

/** Same bounds as signup (`fullNameSchema` on the server). */
const NAME_MAX = 180;

const renamed = z.object({ nombreCompleto: z.string() });

/** «Cambiar nombre»: rectification of the account name (`PATCH /me/account`). */
export function NameChangeScreen() {
  const router = useRouter();
  const principal = useAuthStore((state) => state.principal);
  const refreshAccount = useAuthStore((state) => state.refreshAccount);
  const [name, setName] = useState(principal?.nombreCompleto ?? '');
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [banner, setBanner] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: (nombreCompleto: string) =>
      apiClient.request('/me/account', renamed, { method: 'PATCH', body: { nombreCompleto } }),
    onSuccess: async () => {
      await refreshAccount().catch(() => undefined);
      notify.success(accountNameCopy.saved);
      router.back();
    },
    onError: (error) => {
      const field = error instanceof ApiError ? error.fieldErrors.nombreCompleto : undefined;
      if (field) setFieldError(field);
      else setBanner(resolveError(error).message);
    },
  });

  const submit = () => {
    const parsed = updateAccountNameSchema.safeParse({ nombreCompleto: name });
    if (!parsed.success) return setFieldError(parsed.error.issues[0]?.message);
    setBanner(null);
    save.mutate(parsed.data.nombreCompleto);
  };

  return (
    <ScrollScreen>
      <BackLink fallbackHref="/datos-privacidad" />
      <ScreenHeader detail subtitle="Así te ven el gimnasio y los demás socios." title={accountNameCopy.title} />
      <Card>
        <Input
          autoComplete="name"
          error={fieldError}
          icon="person-outline"
          label={accountNameCopy.label}
          maxLength={NAME_MAX}
          onChangeText={(text) => {
            setName(text);
            setFieldError(undefined);
          }}
          onSubmitEditing={submit}
          textContentType="name"
          value={name}
        />
      </Card>
      {banner ? <AuthAlert message={banner} /> : null}
      <Button
        disabled={name.trim() === (principal?.nombreCompleto ?? '').trim()}
        label={accountNameCopy.submit}
        loading={save.isPending}
        onPress={submit}
      />
    </ScrollScreen>
  );
}
