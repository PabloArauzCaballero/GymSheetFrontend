'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { MapPin, Store } from 'lucide-react';
import {
  businessWizardCopy,
  categoryOptions,
  handleErrorMessages,
  normalizeHandleInput,
  suggestHandles,
} from '@gymsheet/domain';
import { businessProfileFormSchema, type BusinessProfileForm, type EntityType } from '@/shared/api/schemas';
import { ApiError } from '@/shared/api/api-error';
import { queryKeys } from '@/shared/api/query-keys';
import { AuthAlert } from '@/features/auth/components/auth-alert';
import { Button } from '@/shared/components/ui/button';
import { Field } from '@/shared/components/ui/field';
import { InputWithIcon } from '@/shared/components/ui/input';
import { Select } from '@/shared/components/ui/select';
import { useHandleAvailability } from '../hooks/use-handle-availability';
import { businessService } from '../services/business-client';
import { HandleField } from './handle-field';

/**
 * Step 3, «Tu negocio»: name, `@handle` (suggested from the name, checked
 * live), category (filtered by the business type) and city. Saves the handle
 * first (a PENDING reservation) and then the profile; repeating is safe.
 */
export function BusinessProfileStep({
  entityType,
  initial,
  onSaved,
}: Readonly<{ entityType: EntityType; initial: Partial<BusinessProfileForm>; onSaved: () => void }>) {
  const categories = useQuery({
    queryKey: queryKeys.business.categories(entityType),
    queryFn: () => businessService.categories(entityType),
    staleTime: 5 * 60_000,
  });
  const options = useMemo(() => categoryOptions(categories.data ?? []), [categories.data]);
  const form = useForm<BusinessProfileForm>({
    resolver: zodResolver(businessProfileFormSchema),
    defaultValues: {
      name: initial.name ?? '',
      handle: initial.handle ?? suggestHandles(initial.name ?? '', entityType)[0] ?? '',
      primaryCategoryId: initial.primaryCategoryId ?? '',
      city: initial.city ?? '',
    },
  });
  const [name, handle, city] = useWatch({ control: form.control, name: ['name', 'handle', 'city'] });
  const check = useHandleAvailability(handle);
  const suggestions = useMemo(() => suggestHandles(name, entityType, city), [name, entityType, city]);
  const errors = form.formState.errors;

  async function submit(values: BusinessProfileForm) {
    form.clearErrors('root');
    if (check.state === 'invalid' || check.state === 'unavailable') {
      return form.setError('handle', { message: check.message }, { shouldFocus: true });
    }
    try {
      await businessService.claimHandle(normalizeHandleInput(values.handle));
    } catch (error: unknown) {
      const message = error instanceof ApiError && error.code ? handleErrorMessages[error.code] : undefined;
      return form.setError(message ? 'handle' : 'root', { message: message ?? businessWizardCopy.saveFailed }, { shouldFocus: true });
    }
    try {
      await businessService.updateProfile({ name: values.name, primaryCategoryId: values.primaryCategoryId, city: values.city });
      onSaved();
    } catch {
      form.setError('root', { message: businessWizardCopy.saveFailed });
    }
  }

  return (
    <form className="grid gap-5" noValidate onSubmit={form.handleSubmit(submit)}>
      <Field error={errors.name?.message} htmlFor="name" label={businessWizardCopy.fields.businessName.label}>
        <InputWithIcon autoComplete="organization" icon={<Store className="size-4" />} id="name" {...form.register('name')} />
      </Field>
      <HandleField
        check={check}
        error={errors.handle?.message}
        onChange={(value) => form.setValue('handle', value, { shouldDirty: true })}
        suggestions={suggestions}
        value={handle}
      />
      <Field
        error={errors.primaryCategoryId?.message ?? (categories.isError ? businessWizardCopy.categoriesFailed : undefined)}
        htmlFor="primaryCategoryId"
        label={businessWizardCopy.fields.category.label}
      >
        <Select disabled={categories.isPending} id="primaryCategoryId" {...form.register('primaryCategoryId')}>
          <option value="">{businessWizardCopy.fields.category.placeholder}</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </Select>
      </Field>
      {categories.isError ? (
        <Button onClick={() => void categories.refetch()} size="sm" type="button" variant="ghost">
          {businessWizardCopy.retry}
        </Button>
      ) : null}
      <Field error={errors.city?.message} htmlFor="city" label={businessWizardCopy.fields.city.label}>
        <InputWithIcon
          autoComplete="address-level2"
          icon={<MapPin className="size-4" />}
          id="city"
          placeholder={businessWizardCopy.fields.city.placeholder}
          {...form.register('city')}
        />
      </Field>
      {errors.root?.message ? <AuthAlert message={errors.root.message} /> : null}
      <Button className="w-full" loading={form.formState.isSubmitting} size="lg" type="submit" variant="primary">
        {businessWizardCopy.saveBusiness}
      </Button>
    </form>
  );
}
