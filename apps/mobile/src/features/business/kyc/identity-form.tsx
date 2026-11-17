import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';
import { ciExtensionLabels, kycCopy } from '@gymsheet/domain';
import {
  ciExtensions,
  kycPersonFormSchema,
  kycRepresentativeFormSchema,
  representativeDraftPatch,
  type CiExtension,
  type KycPersonForm,
  type KycSubmission,
} from '@gymsheet/schemas';
import { AuthAlert } from '@/components/auth-shell';
import { Select } from '@/components/select';
import { Text } from '@/components/text';
import { Input } from '@/components/ui';
import { spacing } from '@/theme';
import { useDraftSave } from './draft-save';
import { StepNav } from './step-nav';

const extensionOptions = ciExtensions.map((code) => ({ value: code, label: ciExtensionLabels[code] }));

/** «Representante legal» or «Tus datos»: name, the CI as one group (number, complement, department) and the specialty of an individual. */
export function IdentityForm({
  variant,
  submission,
  onSaved,
  onBack,
}: {
  variant: 'representative' | 'person';
  submission: KycSubmission | null;
  onSaved: () => void;
  onBack: () => void;
}) {
  const fields = submission?.fields;
  const savedCi = fields?.repCiMasked ?? null;
  const person = variant === 'person';
  const schema = person ? kycPersonFormSchema(Boolean(savedCi)) : kycRepresentativeFormSchema(Boolean(savedCi));
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
  const submit = form.handleSubmit((values) => save(representativeDraftPatch(values)));

  return (
    <View style={{ gap: spacing.md }}>
      <Controller
        control={form.control}
        name="repFullName"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input autoComplete="name" error={errors.repFullName?.message} label={person ? kycCopy.legal.personFullName : kycCopy.legal.repFullName} onBlur={onBlur} onChangeText={onChange} textContentType="name" value={value} />
        )}
      />
      <View accessibilityLabel={kycCopy.legal.ciLegend} accessibilityRole="none" style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <View style={{ flex: 2 }}>
            <Controller
              control={form.control}
              name="repCiNumber"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input error={errors.repCiNumber?.message} keyboardType="number-pad" label={kycCopy.legal.ciNumber} onBlur={onBlur} onChangeText={onChange} placeholder={savedCi ?? '1234567'} value={value} />
              )}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Controller
              control={form.control}
              name="repCiComplement"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input autoCapitalize="characters" error={errors.repCiComplement?.message} label={kycCopy.legal.ciComplement} maxLength={2} onBlur={onBlur} onChangeText={onChange} placeholder="1A" value={value} />
              )}
            />
          </View>
        </View>
        <Controller
          control={form.control}
          name="repCiExtension"
          render={({ field: { onChange, value } }) => (
            <Select
              error={errors.repCiExtension?.message}
              label={kycCopy.legal.ciExtension}
              onChange={onChange}
              options={extensionOptions}
              placeholder={kycCopy.legal.ciExtension}
              // An empty value matches no option: the placeholder shows.
              value={value as CiExtension}
            />
          )}
        />
        <Text tone="secondary" variant="footnote">{savedCi ? kycCopy.legal.savedSecret(savedCi) : kycCopy.legal.ciComplementHint}</Text>
      </View>
      {person ? (
        <Controller
          control={form.control}
          name="specialty"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input error={errors.specialty?.message} label={kycCopy.legal.specialty} onBlur={onBlur} onChangeText={onChange} placeholder={kycCopy.legal.specialtyPlaceholder} value={value} />
          )}
        />
      ) : null}
      {errors.root?.message ? <AuthAlert message={errors.root.message} /> : null}
      <StepNav loading={form.formState.isSubmitting} onBack={onBack} onNext={submit} />
    </View>
  );
}
