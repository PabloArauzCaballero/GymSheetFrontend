'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import type { BaseSyntheticEvent } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { AtSign, LockKeyhole, Store } from 'lucide-react';
import { authCopy, businessSignupFailures, businessWizardCopy, legalGateCopy } from '@gymsheet/domain';
import {
  TERMS_VERSION_OUTDATED,
  businessAccountFormSchema,
  businessLimits,
  type BusinessSummary,
} from '@/shared/api/schemas';
import { ApiError } from '@/shared/api/api-error';
import { queryKeys } from '@/shared/api/query-keys';
import { useSignupProtection } from '@/features/auth/hooks/use-signup-protection';
import { AuthAlert } from '@/features/auth/components/auth-alert';
import { SignupProtectionFields } from '@/features/auth/components/signup-protection-fields';
import { Button } from '@/shared/components/ui/button';
import { Field } from '@/shared/components/ui/field';
import { InputWithIcon, PasswordInput } from '@/shared/components/ui/input';

import { honeypotValue } from '@/features/auth/lib/honeypot';
import { fetchBusinessLegal, signupBusiness } from '../services/business-client';
import { BusinessTermsField } from './business-terms-field';
import type { BusinessKind } from './business-type-step';

const formSchema = businessAccountFormSchema.extend({
  businessName: z
    .string()
    .trim()
    .min(businessLimits.nameMin, 'Escribe el nombre de tu negocio.')
    .max(businessLimits.nameMax, 'El nombre es demasiado largo.'),
});
type FormValues = z.infer<typeof formSchema>;

/**
 * Step 1, «Tu cuenta»: business name, email, password and the legal
 * checkbox (four fields). Creates the account; the backend emails the PIN.
 */
export function BusinessAccountStep({
  kind,
  onCreated,
  onBack,
}: Readonly<{
  kind: BusinessKind;
  onCreated: (created: { email: string; businessName: string; business: BusinessSummary }) => void;
  onBack: () => void;
}>) {
  const legal = useQuery({ queryKey: queryKeys.business.legalCurrent, queryFn: fetchBusinessLegal, staleTime: 5 * 60_000 });
  const protection = useSignupProtection();
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { businessName: '', email: '', password: '', acceptedTerms: false },
  });
  const errors = form.formState.errors;

  async function submit(values: FormValues, event?: BaseSyntheticEvent) {
    form.clearErrors('root');
    const documents = legal.data ?? (await legal.refetch()).data;
    if (!documents?.length || !kind.type) return form.setError('root', { message: legalGateCopy.versionUnavailable });
    try {
      const evidence = await protection.evidence(honeypotValue(event));
      const created = await signupBusiness({
        email: values.email,
        password: values.password,
        businessName: values.businessName,
        entityType: kind.type,
        ...(kind.legalKind ? { legalKind: kind.legalKind } : {}),
        // The whole current set, with the hash of the text shown when the server sent one.
        acceptances: documents.map(({ document, version, contentSha256 }) => ({
          document,
          version,
          ...(contentSha256 ? { contentSha256 } : {}),
        })),
        ...evidence,
      });
      onCreated({ email: values.email.trim().toLowerCase(), businessName: values.businessName.trim(), business: created.business });
    } catch (error: unknown) {
      // The ticket is single-use: any refused attempt asks for a new one.
      void protection.renew();
      if (error instanceof ApiError && error.code === TERMS_VERSION_OUTDATED) {
        void legal.refetch();
        form.setValue('acceptedTerms', false);
      }
      businessSignupFailures(error).forEach(({ field, message }, index) =>
        form.setError(field, { message }, { shouldFocus: index === 0 }),
      );
    }
  }

  return (
    <form className="grid gap-5" method="post" noValidate onSubmit={form.handleSubmit(submit)}>
      <Field error={errors.businessName?.message} htmlFor="businessName" label={businessWizardCopy.fields.businessName.label}>
        <InputWithIcon
          autoComplete="organization"
          icon={<Store className="size-4" />}
          id="businessName"
          placeholder={businessWizardCopy.fields.businessName.placeholder}
          {...form.register('businessName')}
        />
      </Field>
      <Field error={errors.email?.message} htmlFor="email" label={authCopy.fields.email.label}>
        <InputWithIcon
          autoComplete="email"
          icon={<AtSign className="size-4" />}
          id="email"
          autoCapitalize="none"
          inputMode="email"
          placeholder={authCopy.fields.email.placeholder}
          spellCheck={false}
          type="email"
          {...form.register('email')}
        />
      </Field>
      <Field error={errors.password?.message} htmlFor="password" label={authCopy.fields.password.label}>
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
      <BusinessTermsField error={errors.acceptedTerms?.message} registration={form.register('acceptedTerms')} />
      <SignupProtectionFields onTurnstileToken={protection.onTurnstileToken} turnstileKey={protection.turnstileKey} />
      {errors.root?.message ? <AuthAlert message={errors.root.message} /> : null}
      <div className="grid gap-3">
        <Button className="w-full" loading={form.formState.isSubmitting} size="lg" type="submit" variant="primary">
          {businessWizardCopy.createAccount}
        </Button>
        <Button className="w-full" disabled={form.formState.isSubmitting} onClick={onBack} type="button" variant="ghost">
          {businessWizardCopy.back}
        </Button>
      </div>
    </form>
  );
}

