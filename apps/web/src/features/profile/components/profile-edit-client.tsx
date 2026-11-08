'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Save } from 'lucide-react';
import Link from 'next/link';
import { BodyWeightCard } from '@/features/profile/components/body-weight-card';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { notify } from '@/shared/notifications';
import { goalLabels, profileFormSchema, type ProfileFormValues } from '@/features/profile/components/profile-form-schema';
import { profileService } from '@/features/profile/services/profile-service';
import * as birthDate from '@/features/profile/lib/birth-date';
import { ProfileMeasurements } from '@/features/profile/components/profile-measurements';
import { ApiError } from '@/shared/api/api-error';
import { trainingGoals } from '@/shared/api/contracts';
import { queryKeys } from '@/shared/api/query-keys';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import {
  SkeletonDetail,
  SkeletonPageHeader,
  SkeletonScreen,
} from '@/shared/components/feedback/skeleton';
import { PageHeader } from '@/shared/components/layout/page-header';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import { Field } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import { Select } from '@/shared/components/ui/select';

/**
 * «Editar perfil» del móvil (`profile-edit.tsx`): el formulario de datos y la
 * evolución del peso. La ficha de identidad vive en `/profile`.
 */
export function ProfileEditClient() {
  const queryClient = useQueryClient();
  const user = useQuery({ queryKey: ['user', 'me'], queryFn: profileService.getUser });

  const profile = useQuery({
    queryKey: queryKeys.profile,
    queryFn: async () => {
      try {
        return await profileService.getProfile();
      } catch (error: unknown) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }
    },
    retry: false,
  });
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: { fechaNacimiento: '', pesoKg: 70, estaturaCm: 170, objetivo: 'SALUD_GENERAL' },
  });
  useEffect(() => {
    if (profile.data)
      form.reset({
        fechaNacimiento: profile.data.fechaNacimiento ?? '',
        pesoKg: profile.data.pesoKg,
        estaturaCm: profile.data.estaturaCm,
        objetivo: profile.data.objetivo,
      });
  }, [form, profile.data]);
  const save = useMutation({
    mutationFn: ({ fechaNacimiento, ...values }: ProfileFormValues) => {
      const hadBirthDate = Boolean(profile.data?.fechaNacimiento);
      const input = { ...values, ...birthDate.birthDatePayload(fechaNacimiento, hadBirthDate) };
      return profile.data
        ? profileService.updateProfile(input)
        : profileService.createProfile(input);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.profile }),
        // El peso guardado aquí también queda en el histórico desde ahora;
        // sin esto la tabla de abajo no mostraría el registro recién creado
        // hasta recargar la página.
        queryClient.invalidateQueries({ queryKey: queryKeys.bodyMeasurements }),
      ]);
      notify.success('Perfil actualizado.');
    },
    onError: (error: Error) => form.setError('root', { message: error.message }),
  });
  if (profile.isLoading || user.isLoading) {
    return (
      <SkeletonScreen className="gap-8" label="Cargando tu perfil">
        <SkeletonPageHeader />
        <SkeletonDetail />
      </SkeletonScreen>
    );
  }

  /* El formulario se inicializa con los datos del perfil. Si la petición falla
     se renderizaba igualmente, en blanco y editable: guardar desde ahí habría
     sobrescrito el perfil real con campos vacíos. */
  if (profile.isError || user.isError) {
    return (
      <ErrorPanel
        message={(profile.error ?? user.error)?.message ?? 'No se pudo cargar tu perfil.'}
        onRetry={() => {
          void profile.refetch();
          void user.refetch();
        }}
      />
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-[560px] gap-8">
      <Link
        className="t-subhead inline-flex w-fit items-center gap-1 text-[var(--text-muted)] hover:text-[var(--text)]"
        href="/profile"
      >
        <ChevronLeft aria-hidden className="size-4" />
        Perfil
      </Link>
      <PageHeader
        description={
          profile.data
            ? 'Mantén tus datos al día para seguir tu progreso.'
            : 'Completa tus datos para personalizar tus entrenos.'
        }
        title={profile.data ? 'Editar perfil' : 'Completar perfil'}
        tutorialId="page:profile"
      />
      <section className="grid gap-5" id="personal">
        <form onSubmit={form.handleSubmit((values) => save.mutate(values))}>
          <Card>
            <CardHeader
              description="Estos valores son utilizados por el dominio para describir tu perfil, no para emitir diagnóstico médico."
              title="Datos antropométricos"
            />
            <CardContent className="grid gap-5 sm:grid-cols-2">
              <Field
                error={form.formState.errors.fechaNacimiento?.message}
                htmlFor="fechaNacimiento"
                label="Fecha de nacimiento"
              >
                <Input
                  id="fechaNacimiento"
                  max={birthDate.isoYearsAgo(birthDate.MIN_AGE)}
                  min={birthDate.isoYearsAgo(birthDate.MAX_AGE + 1)}
                  type="date"
                  {...form.register('fechaNacimiento')}
                />
              </Field>
              <Field
                error={form.formState.errors.pesoKg?.message}
                htmlFor="pesoKg"
                label="Peso (kg)"
              >
                <Input
                  id="pesoKg"
                  max="400"
                  min="1"
                  step="0.1"
                  type="number"
                  {...form.register('pesoKg', { valueAsNumber: true })}
                />
              </Field>
              <Field
                error={form.formState.errors.estaturaCm?.message}
                htmlFor="estaturaCm"
                label="Estatura (cm)"
              >
                <Input
                  id="estaturaCm"
                  max="250"
                  min="80"
                  type="number"
                  {...form.register('estaturaCm', { valueAsNumber: true })}
                />
              </Field>
              <Field
                error={form.formState.errors.objetivo?.message}
                htmlFor="objetivo"
                label="Objetivo"
              >
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
              <Button
                className="sm:col-span-2"
                loading={save.isPending}
                size="lg"
                type="submit"
                variant="primary"
              >
                <Save className="size-4" />
                Guardar perfil
              </Button>
            </CardContent>
          </Card>
        </form>
      </section>
      <section className="grid gap-5" id="progress">
        <BodyWeightCard />
        <ProfileMeasurements />
      </section>
    </div>
  );
}
