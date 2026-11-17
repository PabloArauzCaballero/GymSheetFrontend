'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { kycCopy } from '@gymsheet/domain';
import { companyDraftPatch, kycCompanyFormSchema, type KycCompanyForm, type KycSubmission } from '@/shared/api/schemas';
import { AuthAlert } from '@/features/auth/components/auth-alert';
import { Field } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import { KycNav } from './kyc-nav';
import { useDraftSave } from './use-draft-save';

/** «Tu empresa»: razón social, NIT, dirección and the optional SEPREC number (four fields). */
export function KycCompanyForm({
  submission,
  onSaved,
  onBack,
}: Readonly<{ submission: KycSubmission | null; onSaved: (submission: KycSubmission) => void; onBack: () => void }>) {
  const fields = submission?.fields;
  const savedNit = fields?.nitMasked ?? null;
  const form = useForm<KycCompanyForm>({
    resolver: zodResolver(kycCompanyFormSchema(Boolean(savedNit))),
    mode: 'onTouched',
    defaultValues: { legalName: fields?.legalName ?? '', nit: '', address: fields?.address ?? '', seprecNumber: fields?.seprecNumber ?? '' },
  });
  const save = useDraftSave(form, onSaved);
  const errors = form.formState.errors;

  return (
    <form className="grid gap-5" noValidate onSubmit={form.handleSubmit((values) => save(companyDraftPatch(values)))}>
      <Field error={errors.legalName?.message} htmlFor="kyc-legal-name" label={kycCopy.legal.legalName}>
        <Input autoComplete="organization" id="kyc-legal-name" placeholder={kycCopy.legal.legalNamePlaceholder} {...form.register('legalName')} />
      </Field>
      <Field
        error={errors.nit?.message}
        hint={savedNit ? kycCopy.legal.savedSecret(savedNit) : undefined}
        htmlFor="kyc-nit"
        label={kycCopy.legal.nit}
      >
        <Input
          autoComplete="off"
          className="tabular-nums"
          id="kyc-nit"
          inputMode="numeric"
          placeholder={savedNit ?? kycCopy.legal.nitPlaceholder}
          {...form.register('nit')}
        />
      </Field>
      <Field error={errors.address?.message} htmlFor="kyc-address" label={kycCopy.legal.address}>
        <Input autoComplete="street-address" id="kyc-address" placeholder={kycCopy.legal.addressPlaceholder} {...form.register('address')} />
      </Field>
      <Field error={errors.seprecNumber?.message} htmlFor="kyc-seprec" label={kycCopy.legal.seprec}>
        <Input autoComplete="off" id="kyc-seprec" {...form.register('seprecNumber')} />
      </Field>
      {errors.root?.message ? <AuthAlert message={errors.root.message} /> : null}
      <KycNav loading={form.formState.isSubmitting} nextType="submit" onBack={onBack} />
    </form>
  );
}
