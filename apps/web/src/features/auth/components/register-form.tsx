'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { AtSign, LockKeyhole, ShieldCheck, UserRound } from 'lucide-react';
import { authCopy, authDestination, authErrorMessage, genderOptions } from '@gymsheet/domain';
import {
  registerDefaults,
  registerSchema,
  toRegisterPayload,
  type RegisterInput,
} from '@/shared/api/schemas';
import { register as createAccount } from '@/features/auth/services/auth-client';
import { ApiError } from '@/shared/api/api-error';
import { AuthAlert } from '@/features/auth/components/auth-alert';
import { Button } from '@/shared/components/ui/button';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Field } from '@/shared/components/ui/field';
import { InputWithIcon, PasswordInput } from '@/shared/components/ui/input';
import { Select } from '@/shared/components/ui/select';

export function RegisterForm() {
  const router = useRouter();
  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: registerDefaults,
  });

  async function submit(values: RegisterInput) {
    form.clearErrors('root');
    try {
      // La traducción a lo que espera el servidor —quitar la confirmación,
      // omitir el género vacío— la hace el paquete compartido, no esta pantalla.
      await createAccount(toRegisterPayload(values));
      // Al onboarding directamente, igual que el móvil. Antes iba al panel y
      // un guardia la rebotaba, así que la cuenta recién creada veía medio
      // panel antes del cuestionario.
      router.replace(authDestination.web.afterRegister);
      router.refresh();
    } catch (error: unknown) {
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

      <Field
        error={form.formState.errors.genero?.message}
        hint={authCopy.fields.gender.hint}
        htmlFor="genero"
        label={authCopy.fields.gender.label}
      >
        {/* Campo de valores cerrados: selector, no texto libre ni botones
            sueltos. Las opciones vienen del paquete compartido, así que el
            móvil ofrece exactamente las mismas y en el mismo orden. */}
        <Select id="genero" {...form.register('genero')}>
          {genderOptions.map((option) => (
            <option key={option.label} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </Field>

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
