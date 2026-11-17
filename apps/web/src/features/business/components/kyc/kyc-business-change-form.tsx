'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { businessWizardCopy, categoryOptions, kycCopy } from '@gymsheet/domain';
import { queryKeys } from '@/shared/api/query-keys';
import { kycBusinessChangeFormSchema, type EntityType, type KycBusinessChangeForm, type KycSubmission } from '@/shared/api/schemas';
import { AuthAlert } from '@/features/auth/components/auth-alert';
import { Field } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import { Select } from '@/shared/components/ui/select';
import { businessService } from '../../services/business-client';
import { KycNav } from './kyc-nav';
import { useDraftSave } from './use-draft-save';

/**
 * «Tu negocio» inside a material change (backend `POST /business/me/kyc/changes`):
 * the name and category of an approved business only change through REPP's review.
 */
export function KycBusinessChangeForm({
  entityType,
  submission,
  current,
  onSaved,
  onBack,
}: Readonly<{
  entityType: EntityType;
  submission: KycSubmission | null;
  /** The listing as it is published now, when the change copied no name or category. */
  current: { name: string; primaryCategoryId: string | null };
  onSaved: (submission: KycSubmission) => void;
  onBack?: () => void;
}>) {
  const categories = useQuery({
    queryKey: queryKeys.business.categories(entityType),
    queryFn: () => businessService.categories(entityType),
    staleTime: 5 * 60_000,
  });
  const options = useMemo(() => categoryOptions(categories.data ?? []), [categories.data]);
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
    <form className="grid gap-5" noValidate onSubmit={form.handleSubmit((values) => save(values))}>
      <Field error={errors.tradeName?.message} htmlFor="kyc-trade-name" label={kycCopy.legal.tradeName}>
        <Input autoComplete="organization" id="kyc-trade-name" {...form.register('tradeName')} />
      </Field>
      <Field
        error={errors.primaryCategoryId?.message ?? (categories.isError ? businessWizardCopy.categoriesFailed : undefined)}
        htmlFor="kyc-category"
        label={businessWizardCopy.fields.category.label}
      >
        <Select disabled={categories.isPending} id="kyc-category" {...form.register('primaryCategoryId')}>
          <option value="">{businessWizardCopy.fields.category.placeholder}</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </Select>
      </Field>
      {errors.root?.message ? <AuthAlert message={errors.root.message} /> : null}
      <KycNav loading={form.formState.isSubmitting} nextType="submit" {...(onBack ? { onBack } : {})} />
    </form>
  );
}
