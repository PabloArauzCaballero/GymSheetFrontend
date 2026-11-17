'use client';

import type { UseFormRegisterReturn } from 'react-hook-form';
import { birthDateBounds, signupCopy } from '@/features/auth/lib/signup';
import { Field } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';

/**
 * Native date input: the platform picker on iOS/Android, typed digits with the
 * keyboard on desktop, always `YYYY-MM-DD`. The bounds change at midnight,
 * hence no hydration warning. Shared by the signup and the Google completion.
 */
export function BirthDateField({
  registration,
  error,
}: Readonly<{ registration: UseFormRegisterReturn<'fechaNacimiento'>; error?: string }>) {
  const bounds = birthDateBounds();
  return (
    <Field
      error={error}
      hint={signupCopy.birthDate.hint}
      htmlFor="fechaNacimiento"
      label={signupCopy.birthDate.label}
    >
      <Input
        autoComplete="bday"
        className="appearance-none text-left [&::-webkit-date-and-time-value]:text-left"
        id="fechaNacimiento"
        max={bounds.max}
        min={bounds.min}
        suppressHydrationWarning
        type="date"
        {...registration}
      />
    </Field>
  );
}
