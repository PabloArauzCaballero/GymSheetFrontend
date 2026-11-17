import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';
import { kycCopy } from '@gymsheet/domain';
import { companyDraftPatch, kycCompanyFormSchema, type KycCompanyForm, type KycSubmission } from '@gymsheet/schemas';
import { AuthAlert } from '@/components/auth-shell';
import { Text } from '@/components/text';
import { Input } from '@/components/ui';
import { spacing } from '@/theme';
import { useDraftSave } from './draft-save';
import { StepNav } from './step-nav';

/** «Tu empresa»: razón social, NIT (numeric keyboard), dirección and the optional SEPREC. */
export function CompanyForm({ submission, onSaved, onBack }: { submission: KycSubmission | null; onSaved: () => void; onBack: () => void }) {
  const fields = submission?.fields;
  const savedNit = fields?.nitMasked ?? null;
  const form = useForm<KycCompanyForm>({
    resolver: zodResolver(kycCompanyFormSchema(Boolean(savedNit))),
    mode: 'onTouched',
    defaultValues: { legalName: fields?.legalName ?? '', nit: '', address: fields?.address ?? '', seprecNumber: fields?.seprecNumber ?? '' },
  });
  const save = useDraftSave(form, onSaved);
  const errors = form.formState.errors;
  const submit = form.handleSubmit((values) => save(companyDraftPatch(values)));

  return (
    <View style={{ gap: spacing.md }}>
      <Controller
        control={form.control}
        name="legalName"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input autoComplete="organization" error={errors.legalName?.message} label={kycCopy.legal.legalName} onBlur={onBlur} onChangeText={onChange} placeholder={kycCopy.legal.legalNamePlaceholder} textContentType="organizationName" value={value} />
        )}
      />
      <Controller
        control={form.control}
        name="nit"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input error={errors.nit?.message} keyboardType="number-pad" label={kycCopy.legal.nit} onBlur={onBlur} onChangeText={onChange} placeholder={savedNit ?? kycCopy.legal.nitPlaceholder} value={value} />
        )}
      />
      {savedNit ? <Text tone="secondary" variant="footnote">{kycCopy.legal.savedSecret(savedNit)}</Text> : null}
      <Controller
        control={form.control}
        name="address"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input autoComplete="street-address" error={errors.address?.message} label={kycCopy.legal.address} onBlur={onBlur} onChangeText={onChange} placeholder={kycCopy.legal.addressPlaceholder} textContentType="fullStreetAddress" value={value} />
        )}
      />
      <Controller
        control={form.control}
        name="seprecNumber"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input error={errors.seprecNumber?.message} label={kycCopy.legal.seprec} onBlur={onBlur} onChangeText={onChange} value={value} />
        )}
      />
      {errors.root?.message ? <AuthAlert message={errors.root.message} /> : null}
      <StepNav loading={form.formState.isSubmitting} onBack={onBack} onNext={submit} />
    </View>
  );
}
