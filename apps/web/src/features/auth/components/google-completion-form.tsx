'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { UserRound } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { authCopy, authDestination } from '@gymsheet/domain';
import { registerSchema } from '@/shared/api/schemas';
import { fieldErrorEntries } from '@/shared/api/api-error';
import { completeGoogleSignup } from '@/features/auth/services/auth-client';
import { currentLegalQueryKey, useCurrentLegal } from '@/features/auth/hooks/use-current-legal';
import { googleErrorMessage } from '@/features/auth/lib/google-errors';
import {
  isTermsVersionOutdated,
  legalGateCopy,
  outdatedCurrentDocuments,
  termsVersionOf,
} from '@/features/legal/lib/legal-documents';
import { AuthAlert } from './auth-alert';
import { BirthDateField } from './birth-date-field';
import { SexField } from './sex-field';
import { TermsField } from './terms-field';
import { Button } from '@/shared/components/ui/button';
import { Field } from '@/shared/components/ui/field';
import { InputWithIcon } from '@/shared/components/ui/input';

/** Same rules as the signup fields (the refined signup schema cannot be `.pick`ed). */
const completionSchema = z.object({
  nombreCompleto: registerSchema.shape.nombreCompleto,
  fechaNacimiento: registerSchema.shape.fechaNacimiento,
  genero: registerSchema.shape.genero,
  acceptedTerms: z
    .boolean()
    .refine(Boolean, authCopy.terms.required),
});
type CompletionInput = z.infer<typeof completionSchema>;
const serverFields = ['nombreCompleto', 'fechaNacimiento', 'genero'] as const;

/**
 * The profile a Google identity still needs before the account exists: name,
 * birth date, sex and the terms. The signup token never leaves the BFF.
 */
export function GoogleCompletionForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const legal = useCurrentLegal();
  const form = useForm<CompletionInput>({
    resolver: zodResolver(completionSchema),
    defaultValues: { nombreCompleto: '', fechaNacimiento: '', genero: '', acceptedTerms: false },
  });
  const rootError = form.formState.errors.root?.message;

  async function submit(values: CompletionInput) {
    form.clearErrors('root');
    const termsVersion = termsVersionOf(legal.data ?? (await legal.refetch()).data);
    if (!termsVersion || values.genero === '') {
      form.setError('root', { message: legalGateCopy.versionUnavailable });
      return;
    }
    try {
      await completeGoogleSignup({
        nombreCompleto: values.nombreCompleto.trim(),
        fechaNacimiento: values.fechaNacimiento,
        genero: values.genero,
        termsVersion,
        acceptedTerms: true,
      });
      router.replace(authDestination.web.afterRegister);
      router.refresh();
    } catch (error: unknown) {
      if (isTermsVersionOutdated(error)) {
        const fresh = outdatedCurrentDocuments(error.details);
        if (fresh) queryClient.setQueryData(currentLegalQueryKey, fresh);
        form.setValue('acceptedTerms', false);
        return form.setError('root', { message: legalGateCopy.outdatedAtSignup });
      }
      const fieldErrors = fieldErrorEntries(error, serverFields);
      fieldErrors.forEach(([field, message], index) =>
        form.setError(field, { message }, { shouldFocus: index === 0 }),
      );
      if (fieldErrors.length > 0) return;
      form.setError('root', { message: googleErrorMessage(error) });
    }
  }

  return (
    <form className="grid gap-5" method="post" noValidate onSubmit={form.handleSubmit(submit)}>
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
      <div className="grid gap-5 lg:grid-cols-2 lg:gap-4">
        <BirthDateField
          error={form.formState.errors.fechaNacimiento?.message}
          registration={form.register('fechaNacimiento')}
        />
        <SexField
          error={form.formState.errors.genero?.message}
          registration={form.register('genero')}
        />
      </div>
      <TermsField
        error={form.formState.errors.acceptedTerms?.message}
        registration={form.register('acceptedTerms')}
      />
      {rootError ? <AuthAlert message={rootError} /> : null}
      <Button
        className="mt-1 w-full"
        loading={form.formState.isSubmitting}
        size="lg"
        type="submit"
        variant="primary"
      >
        {authCopy.register.submit}
      </Button>
      <p className="text-center text-[15px] text-[var(--text-muted)]">
        <Link
          className="font-semibold text-[var(--text)] underline decoration-[var(--volt)] underline-offset-4"
          href="/register"
        >
          Usar otro método
        </Link>
      </p>
    </form>
  );
}
