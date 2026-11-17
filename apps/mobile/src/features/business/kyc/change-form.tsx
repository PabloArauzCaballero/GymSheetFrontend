import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';
import { businessWizardCopy, categoryOptions, kycCopy } from '@gymsheet/domain';
import { queryKeys } from '@gymsheet/hooks';
import { kycBusinessChangeFormSchema, type EntityType, type KycBusinessChangeForm, type KycSubmission } from '@gymsheet/schemas';
import { AuthAlert } from '@/components/auth-shell';
import { Select } from '@/components/select';
import { Input } from '@/components/ui';
import { spacing } from '@/theme';
import { businessService } from '../business-service';
import { useDraftSave } from './draft-save';
import { StepNav } from './step-nav';

/** «Tu negocio» in a material change: name and category of an approved business, reviewed by REPP. */
export function ChangeForm({
  entityType,
  submission,
  current,
  onSaved,
  onBack,
}: {
  entityType: EntityType;
  submission: KycSubmission | null;
  current: { name: string; primaryCategoryId: string | null };
  onSaved: () => void;
  onBack: () => void;
}) {
  const categories = useQuery({
    queryKey: queryKeys.business.categories(entityType),
    queryFn: () => businessService.categories(entityType),
    staleTime: 5 * 60_000,
  });
  const options = useMemo(() => categoryOptions(categories.data ?? []).map((option) => ({ value: option.id, label: option.label })), [categories.data]);
  const form = useForm<KycBusinessChangeForm>({
    resolver: zodResolver(kycBusinessChangeFormSchema),
    mode: 'onTouched',
    defaultValues: {
      tradeName: submission?.fields.tradeName ?? current.name,
      primaryCategoryId: submission?.fields.primaryCategoryId ?? current.primaryCategoryId ?? '',
    },
  });
  const save = useDraftSave(form, onSaved);
  const errors = form.formState.errors;

  return (
    <View style={{ gap: spacing.md }}>
      <Controller
        control={form.control}
        name="tradeName"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input error={errors.tradeName?.message} label={kycCopy.legal.tradeName} onBlur={onBlur} onChangeText={onChange} value={value} />
        )}
      />
      <Controller
        control={form.control}
        name="primaryCategoryId"
        render={({ field: { onChange, value } }) => (
          <Select
            error={errors.primaryCategoryId?.message ?? (categories.isError ? businessWizardCopy.categoriesFailed : undefined)}
            label={businessWizardCopy.fields.category.label}
            onChange={onChange}
            options={options}
            placeholder={businessWizardCopy.fields.category.placeholder}
            value={value}
          />
        )}
      />
      {errors.root?.message ? <AuthAlert message={errors.root.message} /> : null}
      <StepNav loading={form.formState.isSubmitting} onBack={onBack} onNext={form.handleSubmit((values) => save(values))} />
    </View>
  );
}
