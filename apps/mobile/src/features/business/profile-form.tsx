import { useMemo } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { View } from 'react-native';
import { ApiError } from '@gymsheet/api-client';
import {
  businessWizardCopy,
  categoryOptions,
  handleErrorMessages,
  normalizeHandleInput,
  suggestHandles,
} from '@gymsheet/domain';
import { queryKeys } from '@gymsheet/hooks';
import { businessProfileFormSchema, type BusinessProfileForm, type EntityType } from '@gymsheet/schemas';
import { AuthAlert } from '@/components/auth-shell';
import { Select } from '@/components/select';
import { Button, Input } from '@/components/ui';
import { spacing } from '@/theme';
import { businessService } from './business-service';
import { HandleField } from './handle-field';
import { useHandleAvailability } from './use-handle-availability';

/**
 * Step 3, «Tu negocio»: name, `@handle` (suggested, checked live), category
 * (by business type) and city. Claims the handle (PENDING), then the profile.
 */
export function ProfileForm({
  entityType,
  initial,
  onSaved,
}: {
  entityType: EntityType;
  initial: Partial<BusinessProfileForm>;
  onSaved: () => void | Promise<void>;
}) {
  const categories = useQuery({
    queryKey: queryKeys.business.categories(entityType),
    queryFn: () => businessService.categories(entityType),
    staleTime: 5 * 60_000,
  });
  const options = useMemo(
    () => categoryOptions(categories.data ?? []).map((option) => ({ value: option.id, label: option.label })),
    [categories.data],
  );
  const { control, handleSubmit, setError, setValue, formState } = useForm<BusinessProfileForm>({
    resolver: zodResolver(businessProfileFormSchema),
    defaultValues: {
      name: initial.name ?? '',
      handle: initial.handle ?? suggestHandles(initial.name ?? '', entityType)[0] ?? '',
      primaryCategoryId: initial.primaryCategoryId ?? '',
      city: initial.city ?? '',
    },
  });
  const [name, handle, city] = useWatch({ control, name: ['name', 'handle', 'city'] });
  const check = useHandleAvailability(handle);
  const suggestions = useMemo(() => suggestHandles(name, entityType, city), [name, entityType, city]);
  const errors = formState.errors;

  const submit = handleSubmit(async (values) => {
    if (check.state === 'invalid' || check.state === 'unavailable') return setError('handle', { message: check.message });
    try {
      await businessService.claimHandle(normalizeHandleInput(values.handle));
    } catch (error) {
      const message = error instanceof ApiError && error.code ? handleErrorMessages[error.code] : undefined;
      return setError(message ? 'handle' : 'root', { message: message ?? businessWizardCopy.saveFailed });
    }
    try {
      await businessService.updateProfile({ name: values.name, primaryCategoryId: values.primaryCategoryId, city: values.city });
      await onSaved();
    } catch {
      setError('root', { message: businessWizardCopy.saveFailed });
    }
  });

  return (
    <View style={{ gap: spacing.md }}>
      <Controller
        control={control}
        name="name"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input error={errors.name?.message} icon="storefront-outline" label={businessWizardCopy.fields.businessName.label} onBlur={onBlur} onChangeText={onChange} value={value} />
        )}
      />
      <HandleField
        check={check}
        error={errors.handle?.message}
        onChange={(value) => setValue('handle', value, { shouldDirty: true })}
        suggestions={suggestions}
        value={handle}
      />
      <Controller
        control={control}
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
      {categories.isError ? (
        <Button icon="refresh-outline" label={businessWizardCopy.retry} onPress={() => void categories.refetch()} size="sm" variant="secondary" />
      ) : null}
      <Controller
        control={control}
        name="city"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input error={errors.city?.message} icon="location-outline" label={businessWizardCopy.fields.city.label} onBlur={onBlur} onChangeText={onChange} placeholder={businessWizardCopy.fields.city.placeholder} textContentType="addressCity" value={value} />
        )}
      />
      {errors.root?.message ? <AuthAlert message={errors.root.message} /> : null}
      <Button icon="checkmark" label={businessWizardCopy.saveBusiness} loading={formState.isSubmitting} onPress={submit} />
    </View>
  );
}
