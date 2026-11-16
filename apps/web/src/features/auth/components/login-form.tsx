'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { AtSign, LockKeyhole } from 'lucide-react';
import {
  accountSanctionMessage,
  accountSuspensionCopy,
  authCopy,
  authDestination,
  authErrorMessage,
} from '@gymsheet/domain';
import { suspensionFromParams } from '@/shared/auth/suspension';
import { loginDefaults, loginSchema, type LoginInput } from '@/shared/api/schemas';
import { login } from '@/features/auth/services/auth-client';
import { ApiError } from '@/shared/api/api-error';
import { AuthAlert } from '@/features/auth/components/auth-alert';
import { GoogleSignIn } from '@/features/auth/components/google-sign-in';
import { Button } from '@/shared/components/ui/button';
import { Field } from '@/shared/components/ui/field';
import { InputWithIcon, PasswordInput } from '@/shared/components/ui/input';

function safeReturnTo(value: string | null) {
  return value?.startsWith('/') && !value.startsWith('//')
    ? value
    : authDestination.web.afterLogin;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Arrived from a session the backend refused as suspended (portal or a request).
  const arrivedSuspended = suspensionFromParams(searchParams);
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: loginDefaults,
  });

  async function submit(values: LoginInput) {
    form.clearErrors('root');
    try {
      await login(values);
      router.replace(safeReturnTo(searchParams.get('returnTo')));
      router.refresh();
    } catch (error: unknown) {
      // El mapeo vive en `@gymsheet/domain` para que el móvil diga exactamente
      // lo mismo ante el mismo fallo. Un 401 aquí significa credenciales
      // incorrectas, no sesión caducada.
      // A sanction is told by its code (403 ACCOUNT_SUSPENDED / ACCOUNT_BANNED), never by matching the text.
      const sanction = accountSanctionMessage(error);
      form.setError('root', {
        message: sanction
          ? sanction
          : error instanceof ApiError
            ? authErrorMessage(error.kind, 'login', error.message)
            : authErrorMessage(undefined, 'login'),
      });
    }
  }

  return (
    <div className="grid gap-6">
    <form className="grid gap-5" method="post" onSubmit={form.handleSubmit(submit)} noValidate>
      <Field
        error={form.formState.errors.email?.message}
        htmlFor="email"
        label={authCopy.fields.email.label}
      >
        <InputWithIcon
          autoComplete="email"
          icon={<AtSign className="size-4" />}
          id="email"
          placeholder={authCopy.fields.email.placeholder}
          type="email"
          {...form.register('email')}
        />
      </Field>

      <Field
        error={form.formState.errors.password?.message}
        htmlFor="password"
        label={authCopy.fields.password.label}
      >
        <PasswordInput
          autoComplete="current-password"
          hideLabel={authCopy.hidePassword}
          icon={<LockKeyhole className="size-4" />}
          id="password"
          placeholder="••••••••"
          showLabel={authCopy.showPassword}
          {...form.register('password')}
        />
      </Field>

      {form.formState.errors.root?.message ? (
        <AuthAlert message={form.formState.errors.root.message} />
      ) : arrivedSuspended && !form.formState.isSubmitted ? (
        <AuthAlert message={accountSuspensionCopy.notice(arrivedSuspended)} />
      ) : null}

      <Button
        className="mt-1 w-full"
        loading={form.formState.isSubmitting}
        size="lg"
        type="submit"
        variant="primary"
      >
        {authCopy.login.submit}
      </Button>

      {/* La recuperación va junto al botón, no escondida al final: quien la
          necesita ya ha fallado una vez y no está para buscarla. */}
      <p className="text-center text-sm">
        <Link
          className="text-[var(--text-muted)] underline-offset-4 transition-colors duration-[var(--dur-2)] hover:text-[var(--text)] hover:underline"
          href="/recover-password"
        >
          {authCopy.login.forgotPassword}
        </Link>
      </p>
    </form>
    <GoogleSignIn returnTo={safeReturnTo(searchParams.get('returnTo'))} />
    </div>
  );
}
