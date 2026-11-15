'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { goalLabels, profileFormSchema, type ProfileFormValues } from '@/features/profile/components/profile-form-schema';
import * as birthDate from '@/features/profile/lib/birth-date';
import { profileService } from '@/features/profile/services/profile-service';
import type { Profile } from '@/shared/api/contracts';
import { trainingGoals } from '@/shared/api/contracts';
import { queryKeys } from '@/shared/api/query-keys';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import { Field } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import { Select } from '@/shared/components/ui/select';
import { notify } from '@/shared/notifications';

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
      notify.success('Perfil actualizado.');
    },
    onError: (error: Error) => form.setError('root', { message: error.message }),
  });

  return (
    <form onSubmit={form.handleSubmit((values) => save.mutate(values))}>
      <Card>
        <CardHeader description="Ajustan tus cargas y tus rutinas. No son un diagnóstico médico." title="Peso, estatura y objetivo" />
        <CardContent className="grid gap-5 sm:grid-cols-2">
          {footer ? <div className="sm:col-span-2">{footer}</div> : null}
          <Field error={form.formState.errors.fechaNacimiento?.message} htmlFor="fechaNacimiento" label="Fecha de nacimiento">
            <Input id="fechaNacimiento" max={birthDate.isoYearsAgo(birthDate.MIN_AGE)} min={birthDate.isoYearsAgo(birthDate.MAX_AGE + 1)} type="date" {...form.register('fechaNacimiento')} />
          </Field>
          <Field error={form.formState.errors.pesoKg?.message} htmlFor="pesoKg" label="Peso (kg)">
            <Input id="pesoKg" max="400" min="1" step="0.1" type="number" {...form.register('pesoKg', { valueAsNumber: true })} />
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
          <Button className="sm:col-span-2" loading={save.isPending} size="lg" type="submit" variant="primary">
            <Save className="size-4" />
            Guardar datos
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
