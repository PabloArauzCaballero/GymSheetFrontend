'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { ciExtensionLabels, kycCopy } from '@gymsheet/domain';
import {
  ciExtensions,
  kycPersonFormSchema,
  kycRepresentativeFormSchema,
  representativeDraftPatch,
  type KycPersonForm,
  type KycSubmission,
} from '@/shared/api/schemas';
import { AuthAlert } from '@/features/auth/components/auth-alert';
import { Field } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import { Select } from '@/shared/components/ui/select';
import { KycNav } from './kyc-nav';
import { useDraftSave } from './use-draft-save';

/**
 * «Representante legal» (company) or «Tus datos» (individual): full name, the
 * CI as one group (number, complement, department) and, for an individual,
 * the specialty. At most four things on screen.
 */
export function KycIdentityForm({
  variant,
  submission,
  onSaved,
  onBack,
}: Readonly<{
  variant: 'representative' | 'person';
  submission: KycSubmission | null;
  onSaved: (submission: KycSubmission) => void;
  onBack: () => void;
}>) {
  const fields = submission?.fields;
  const savedCi = fields?.repCiMasked ?? null;
  const person = variant === 'person';
  const schema = person ? kycPersonFormSchema(Boolean(savedCi)) : kycRepresentativeFormSchema(Boolean(savedCi));
  // One form type for both: the representative simply has no specialty field.
  const form = useForm<KycPersonForm>({
    resolver: zodResolver(schema as ReturnType<typeof kycPersonFormSchema>),
    mode: 'onTouched',
    defaultValues: {
      repFullName: fields?.repFullName ?? '',
      repCiNumber: '',
      repCiComplement: fields?.repCiComplement ?? '',
      repCiExtension: (fields?.repCiExtension as KycPersonForm['repCiExtension'] | null) ?? '',
      ...(person ? { specialty: fields?.specialty ?? '' } : {}),
    },
  });
  const save = useDraftSave(form, onSaved);
  const errors = form.formState.errors;
  const ciError = errors.repCiNumber?.message ?? errors.repCiComplement?.message ?? errors.repCiExtension?.message;

  return (
    <form className="grid gap-5" noValidate onSubmit={form.handleSubmit((values) => save(representativeDraftPatch(values)))}>
      <Field error={errors.repFullName?.message} htmlFor="kyc-rep-name" label={person ? kycCopy.legal.personFullName : kycCopy.legal.repFullName}>
        <Input autoComplete="name" id="kyc-rep-name" {...form.register('repFullName')} />
      </Field>
      <fieldset aria-describedby={ciError ? 'kyc-ci-error' : 'kyc-ci-hint'} className="grid gap-1.5">
        <legend className="mb-1.5 text-[15px] leading-5 text-[var(--text-muted)]">{kycCopy.legal.ciLegend}</legend>
        <div className="grid grid-cols-[minmax(0,1fr)_5.5rem] gap-2 sm:grid-cols-[minmax(0,1fr)_5.5rem_9.5rem]">
          <Input
            aria-invalid={errors.repCiNumber ? true : undefined}
            aria-label={kycCopy.legal.ciNumber}
            autoComplete="off"
            className="tabular-nums"
            inputMode="numeric"
            placeholder={savedCi ?? '1234567'}
            {...form.register('repCiNumber')}
          />
          <Input
            aria-invalid={errors.repCiComplement ? true : undefined}
            aria-label={kycCopy.legal.ciComplement}
            autoCapitalize="characters"
            autoComplete="off"
            maxLength={2}
            placeholder="1A"
            {...form.register('repCiComplement')}
          />
          <Select
            aria-invalid={errors.repCiExtension ? true : undefined}
            aria-label={kycCopy.legal.ciExtension}
            className="col-span-2 sm:col-span-1"
            {...form.register('repCiExtension')}
          >
            <option value="">{kycCopy.legal.ciExtension}</option>
            {ciExtensions.map((code) => (
              <option key={code} value={code}>
                {ciExtensionLabels[code]}
              </option>
            ))}
          </Select>
        </div>
        {ciError ? (
          <p className="text-xs text-[var(--danger)]" id="kyc-ci-error" role="alert">
            {ciError}
          </p>
        ) : (
          <p className="text-xs leading-5 text-[var(--text-muted)]" id="kyc-ci-hint">
            {savedCi ? kycCopy.legal.savedSecret(savedCi) : kycCopy.legal.ciComplementHint}
          </p>
        )}
      </fieldset>
      {person ? (
        <Field error={errors.specialty?.message} htmlFor="kyc-specialty" label={kycCopy.legal.specialty}>
          <Input id="kyc-specialty" placeholder={kycCopy.legal.specialtyPlaceholder} {...form.register('specialty')} />
        </Field>
      ) : null}
      {errors.root?.message ? <AuthAlert message={errors.root.message} /> : null}
      <KycNav loading={form.formState.isSubmitting} nextType="submit" onBack={onBack} />
    </form>
  );
}
