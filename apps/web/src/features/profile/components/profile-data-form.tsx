'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import { formatDecimalInput, parseDecimalInput } from '@gymsheet/domain';
import { useEffect, useState, type ReactNode } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { goalLabels, profileFormSchema, type ProfileFormValues } from '@/features/profile/components/profile-form-schema';
import * as birthDate from '@/features/profile/lib/birth-date';
import { useDraftReport } from '@/features/profile/lib/unsaved-guard';
import { profileService } from '@/features/profile/services/profile-service';
import type { Profile } from '@/shared/api/contracts';
import { trainingGoals } from '@/shared/api/contracts';
import { queryKeys } from '@/shared/api/query-keys';
import { SAVE_ROW, SaveStatusLine, useSectionSave } from '@/shared/components/feedback/save-status';
import { Button } from '@/shared/components/ui/button';
import { Section } from '@/shared/components/mobile/section';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Field } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import { Select } from '@/shared/components/ui/select';

/**
 * A weight typed the Spanish way («63,5», a dot works too). Shows the text as
 * typed and hands the form a number, so the API payload stays numeric.
 */
function DecimalInput({ field, id }: Readonly<{ field: { value: number; onChange: (value: number) => void; onBlur: () => void; name: string }; id: string }>) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <Input
      id={id}
      inputMode="decimal"
      name={field.name}
      onBlur={field.onBlur}
      onChange={(event) => {
        setDraft(event.target.value);
        field.onChange(parseDecimalInput(event.target.value));
      }}
      type="text"
      value={draft ?? formatDecimalInput(field.value)}
    />
  );
}

/**
 * The birth date typed as dd/mm/aaaa whatever the browser's locale (a native date input shows
 * mm/dd/yyyy on an English browser). The form holds `YYYY-MM-DD`, as the API stores it.
 */
function BirthDateInput({ field }: Readonly<{ field: { value: string; onChange: (value: string) => void; onBlur: () => void; name: string } }>) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <Input
      autoComplete="bday"
      id="fechaNacimiento"
      inputMode="numeric"
      name={field.name}
      onBlur={field.onBlur}
      onChange={(event) => {
        const masked = birthDate.maskBirthDate(event.target.value);
        setDraft(masked);
        field.onChange(birthDate.isoFromDisplay(masked));
      }}
      placeholder="dd/mm/aaaa"
      type="text"
      value={draft ?? birthDate.displayFromIso(field.value)}
    />
  );
}

const DATA_SAVE_KEY = ['profile', 'data'] as const;

/**
 * Peso, estatura, nacimiento y objetivo (antes era toda la página de edición).
 * `profile === null` es «todavía sin medidas»: se crea con `POST`.
 */
export function ProfileDataForm({ profile, footer }: Readonly<{ profile: Profile | null; footer?: ReactNode }>) {
  const queryClient = useQueryClient();
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: { fechaNacimiento: '', pesoKg: 70, estaturaCm: 170, objetivo: 'SALUD_GENERAL' },
  });
  useEffect(() => {
    if (profile)
      form.reset({
        fechaNacimiento: profile.fechaNacimiento ?? '',
        pesoKg: profile.pesoKg,
        estaturaCm: profile.estaturaCm,
        objetivo: profile.objetivo,
      });
  }, [form, profile]);
  const save = useMutation({
    mutationKey: DATA_SAVE_KEY,
    mutationFn: ({ fechaNacimiento, ...values }: ProfileFormValues) => {
      const input = { ...values, ...birthDate.birthDatePayload(fechaNacimiento, Boolean(profile?.fechaNacimiento)) };
      return profile ? profileService.updateProfile(input) : profileService.createProfile(input);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.profile }),
        // The saved weight is also a new row of the weight history below.
        queryClient.invalidateQueries({ queryKey: queryKeys.bodyMeasurements }),
        // Completing these fields can award profile points.
        queryClient.invalidateQueries({ queryKey: ['progression'] }),
      ]);
    },
    onError: (error: Error) => form.setError('root', { message: error.message }),
  });

  const status = useSectionSave(DATA_SAVE_KEY, form.formState.isDirty);
  useDraftReport('data', form.formState.isDirty);
  return (
    <form onSubmit={form.handleSubmit((values) => save.mutate(values))}>
      {/* «Tus datos», as on the app; the heading sits outside the card like every other section. */}
      <Section title="Tus datos">
      <Card>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          {footer ? <div className="sm:col-span-2">{footer}</div> : null}
          <p className="t-subhead text-[var(--text-muted)] sm:col-span-2">Peso, estatura y objetivo ajustan tus cargas y tus rutinas. No son un diagnóstico médico.</p>
          <Field error={form.formState.errors.fechaNacimiento?.message} hint="Opcional. Día, mes y año: dd/mm/aaaa." htmlFor="fechaNacimiento" label="Fecha de nacimiento">
            {/* Keyed by the saved date: a reload of the profile resets the typed text. */}
            <Controller control={form.control} key={profile?.fechaNacimiento ?? 'none'} name="fechaNacimiento" render={({ field }) => <BirthDateInput field={field} />} />
          </Field>
          <Field error={form.formState.errors.pesoKg?.message} htmlFor="pesoKg" label="Peso (kg)">
            {/* Keyed by the saved weight: a reload of the profile resets the typed text. */}
            <Controller control={form.control} key={profile?.pesoKg ?? 'new'} name="pesoKg" render={({ field }) => <DecimalInput field={field} id="pesoKg" />} />
          </Field>
          <Field error={form.formState.errors.estaturaCm?.message} htmlFor="estaturaCm" label="Estatura (cm)">
            <Input id="estaturaCm" max="250" min="80" type="number" {...form.register('estaturaCm', { valueAsNumber: true })} />
          </Field>
          <Field error={form.formState.errors.objetivo?.message} htmlFor="objetivo" label="Objetivo">
            <Select id="objetivo" {...form.register('objetivo')}>
              {trainingGoals.map((goal) => (
                <option key={goal} value={goal}>
                  {goalLabels[goal]}
                </option>
              ))}
            </Select>
          </Field>
          {form.formState.errors.root?.message ? (
            <p className="text-sm text-[var(--danger-text)] sm:col-span-2" role="alert">
              {form.formState.errors.root.message}
            </p>
          ) : null}
          {/* One save per section, the same row as every other section: status left, button right. */}
          <div className={`${SAVE_ROW} sm:col-span-2`}>
            <SaveStatusLine saved="Datos guardados." status={status} testId="data-status" />
            <Button disabled={profile !== null && !form.formState.isDirty} loading={save.isPending} size="sm" type="submit" variant="primary">
              <Save aria-hidden className="size-4" />
              Guardar datos
            </Button>
          </div>
        </CardContent>
      </Card>
      </Section>
    </form>
  );
}
