'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { AtSign, LockKeyhole, ShieldCheck, UserRound } from 'lucide-react';
import { authCopy, authDestination, authErrorMessage } from '@gymsheet/domain';
import {
  registerDefaults,
  registerSchema,
  toRegisterPayload,
  type RegisterInput,
} from '@/shared/api/schemas';
import { register as createAccount } from '@/features/auth/services/auth-client';
import { currentLegalQueryKey, useCurrentLegal } from '@/features/auth/hooks/use-current-legal';
import { registerFieldErrors } from '@/features/auth/lib/register-errors';
import { birthDateBounds, signupCopy } from '@/features/auth/lib/signup';
import {
  isTermsVersionOutdated,
  legalGateCopy,
  outdatedCurrentDocuments,
  termsVersionOf,
} from '@/features/legal/lib/legal-documents';
import { ApiError } from '@/shared/api/api-error';
import { AuthAlert } from '@/features/auth/components/auth-alert';
import { SexField } from '@/features/auth/components/sex-field';
import { Button } from '@/shared/components/ui/button';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Field } from '@/shared/components/ui/field';
import { Input, InputWithIcon, PasswordInput } from '@/shared/components/ui/input';

export function RegisterForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const legal = useCurrentLegal();
  const bounds = birthDateBounds();
  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: registerDefaults,
  });

  /** The terms changed while the form was open: show the new ones and ask again. */
  function askToAcceptAgain(error: ApiError) {
    const fresh = outdatedCurrentDocuments(error.details);
    if (fresh) queryClient.setQueryData(currentLegalQueryKey, fresh);
    else void legal.refetch();
    form.setValue('acceptedTerms', false);
    form.setError('root', { message: legalGateCopy.outdatedAtSignup });
  }

  async function submit(values: RegisterInput) {
    form.clearErrors('root');
    // The version the person is accepting; the server rejects a stale one (409).
    const termsVersion = termsVersionOf(legal.data ?? (await legal.refetch()).data);
    if (!termsVersion) {
      form.setError('root', { message: legalGateCopy.versionUnavailable });
      return;
    }
    try {
      // La traducción a lo que espera el servidor —quitar la confirmación—
      // la hace el paquete compartido, no esta pantalla.
      await createAccount(toRegisterPayload(values, termsVersion));
      // Al onboarding directamente, igual que el móvil. Antes iba al panel y
      // un guardia la rebotaba, así que la cuenta recién creada veía medio
      // panel antes del cuestionario.
      router.replace(authDestination.web.afterRegister);
      router.refresh();
    } catch (error: unknown) {
      if (isTermsVersionOutdated(error)) return askToAcceptAgain(error);
      const fieldErrors = registerFieldErrors(error);
      fieldErrors.forEach(([field, message], index) =>
        form.setError(field, { message }, { shouldFocus: index === 0 }),
      );
      if (fieldErrors.length > 0) return;
      form.setError('root', {
        message:
          error instanceof ApiError
            ? authErrorMessage(error.kind, 'register', error.message)
            : authErrorMessage(undefined, 'register'),
      });
    }
  }

  return (
    <form className="grid gap-5" method="post" onSubmit={form.handleSubmit(submit)} noValidate>
      {/* En escritorio, de dos en dos: el alta cabe en una pantalla. */}
      <div className="grid gap-5 lg:grid-cols-2 lg:gap-4">
        <Field
          error={form.formState.errors.nombreCompleto?.message}
          htmlFor="nombreCompleto"
          label={authCopy.fields.fullName.label}
        >
          <InputWithIcon
            autoComplete="name"
            icon={<UserRound className="size-4" />}
            id="nombreCompleto"
            placeholder={authCopy.fields.fullName.placeholder}
            {...form.register('nombreCompleto')}
          />
        </Field>

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
      </div>

      {/* En escritorio, de dos en dos: el alta cabe en una pantalla. */}
      <div className="grid gap-5 lg:grid-cols-2 lg:gap-4">
        <Field
          error={form.formState.errors.password?.message}
          htmlFor="password"
          label={authCopy.fields.password.label}
        >
          <PasswordInput
            autoComplete="new-password"
            hideLabel={authCopy.hidePassword}
            icon={<LockKeyhole className="size-4" />}
            id="password"
            placeholder={authCopy.fields.password.placeholder}
            showLabel={authCopy.showPassword}
            {...form.register('password')}
          />
        </Field>

        <Field
          error={form.formState.errors.confirmation?.message}
          htmlFor="confirmation"
          label={authCopy.fields.confirmation.label}
        >
          <PasswordInput
            autoComplete="new-password"
            hideLabel={authCopy.hidePassword}
            icon={<ShieldCheck className="size-4" />}
            id="confirmation"
            placeholder={authCopy.fields.confirmation.placeholder}
            showLabel={authCopy.showPassword}
            {...form.register('confirmation')}
          />
        </Field>
      </div>

      <div className="grid gap-5 lg:grid-cols-2 lg:gap-4">
        <Field
          error={form.formState.errors.fechaNacimiento?.message}
          hint={signupCopy.birthDate.hint}
          htmlFor="fechaNacimiento"
          label={signupCopy.birthDate.label}
        >
          {/* Native date input: the platform picker on iOS/Android, typed
              digits with the keyboard on desktop, always `YYYY-MM-DD`. The
              bounds change at midnight, hence no hydration warning. */}
          <Input
            autoComplete="bday"
            className="appearance-none text-left [&::-webkit-date-and-time-value]:text-left"
            id="fechaNacimiento"
            max={bounds.max}
            min={bounds.min}
            suppressHydrationWarning
            type="date"
            {...form.register('fechaNacimiento')}
          />
        </Field>

        <SexField error={form.formState.errors.genero?.message} registration={form.register('genero')} />
      </div>

      <div>
        <Checkbox
          label={
            <span>
              {authCopy.terms.prefix}{' '}
              <Link
                className="font-semibold text-[var(--text)] underline decoration-[var(--volt)] underline-offset-4"
                href="/terminos"
                target="_blank"
              >
                {authCopy.terms.termsLabel}
              </Link>{' '}
              {authCopy.terms.connector}{' '}
              <Link
                className="font-semibold text-[var(--text)] underline decoration-[var(--volt)] underline-offset-4"
                href="/privacidad"
                target="_blank"
              >
                {authCopy.terms.privacyLabel}
              </Link>
              .
            </span>
          }
          {...form.register('acceptedTerms')}
        />
        {form.formState.errors.acceptedTerms?.message ? (
          <p className="mt-1 text-xs text-[var(--danger-text)]" role="alert">
            {form.formState.errors.acceptedTerms.message}
          </p>
        ) : null}
      </div>

      {form.formState.errors.root?.message ? (
        <AuthAlert message={form.formState.errors.root.message} />
      ) : null}

      <Button
        className="mt-1 w-full"
        loading={form.formState.isSubmitting}
        size="lg"
        type="submit"
        variant="primary"
      >
        {authCopy.register.submit}
      </Button>
    </form>
  );
}
