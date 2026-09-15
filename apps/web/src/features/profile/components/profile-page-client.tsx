'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ruler, Save, Scale, ShieldCheck, UserRound } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { notify } from '@/shared/notifications';
import { z } from 'zod';
import { profileService } from '@/features/profile/services/profile-service';
import * as birthDate from '@/features/profile/lib/birth-date';
import { ProfilePhotoGallery } from '@/features/profile/components/profile-photo-gallery';
import { SocialStatusCard } from '@/features/social/components/social-status-card';
import { MembershipExperience } from '@/features/membership/components/membership-experience';
import { ProfileMeasurements } from '@/features/profile/components/profile-measurements';
import { GenderPreferenceField } from '@/features/progression/components/gender-preference-field';
import { WeightIncrementField } from '@/features/workouts/components/weight-increment-field';
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
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import { Field } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import { Select } from '@/shared/components/ui/select';
import { formatDateTime } from '@/shared/lib/date';

const schema = z.object({
  fechaNacimiento: birthDate.birthDateInputSchema,
  pesoKg: z.number().min(1).max(400),
  estaturaCm: z.number().int().min(80).max(250),
  objetivo: z.enum(trainingGoals),
});
type FormValues = z.infer<typeof schema>;

const goalLabels: Record<FormValues['objetivo'], string> = {
  HIPERTROFIA: 'Hipertrofia',
  FUERZA: 'Fuerza',
  RESISTENCIA: 'Resistencia',
  PERDIDA_GRASA: 'Pérdida de grasa',
  SALUD_GENERAL: 'Salud general',
  REHABILITACION: 'Rehabilitación',
};

export function ProfilePageClient() {
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
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
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
    mutationFn: ({ fechaNacimiento, ...values }: FormValues) => {
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
    <div className="grid gap-8">
      <PageHeader
        description="Datos antropométricos propios con unidades canónicas del backend: kilogramos y centímetros."
        eyebrow="Cuenta"
        title="Perfil"
        tutorialId="page:profile"
      />
      <nav aria-label="Secciones del perfil" className="flex gap-2 overflow-x-auto pb-2 text-sm">
        {[
          ['#personal', 'Información personal'],
          ['#progress', 'Progreso corporal'],
          ['#membership', 'Mi membresía y accesos'],
        ].map(([href, label]) => (
          <a
            className="whitespace-nowrap rounded-full border border-[var(--border-subtle)] px-4 py-2 text-[var(--text-muted)] transition-colors duration-[var(--dur-2)] hover:text-[var(--text)]"
            href={href}
            key={href}
          >
            {label}
          </a>
        ))}
      </nav>
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]" id="personal">
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
        <div className="grid content-start gap-5">
          <ProfilePhotoGallery />
          {/* El estado social vive aquí y no en Comunidad: es lo que TÚ muestras,
              no una forma de mirar a los demás. Estaba en Comunidad, entre las
              stories y el directorio, que es la única pantalla de la parte social
              que no habla de uno mismo. El móvil ya lo tenía en Perfil. */}
          <SocialStatusCard />
          <Card>
            <CardHeader title="Identidad" />
            <CardContent className="grid gap-4">
              <div className="flex items-center gap-3">
                <UserRound className="size-5 shrink-0 text-[var(--text-muted)]" />
                <div className="min-w-0">
                  <p className="truncate font-semibold">{user.data?.nombreCompleto ?? 'Usuario'}</p>
                  <p className="truncate text-sm text-[var(--text-muted)]">{user.data?.email}</p>
                </div>
              </div>
              <div className="flex justify-between border-t border-[var(--border-subtle)] pt-4">
                <span className="text-sm text-[var(--text-muted)]">Rol</span>
                <Badge>{user.data?.rol ?? '—'}</Badge>
              </div>
              <div className="border-t border-[var(--border-subtle)] pt-4">
                <GenderPreferenceField value={user.data?.genero ?? null} />
              </div>
              <div className="border-t border-[var(--border-subtle)] pt-4">
                <WeightIncrementField value={user.data?.pesoIncrementoKg} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader title="Estado del perfil" />
            <CardContent className="grid gap-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-[var(--text-muted)]">
                  <Scale className="size-4" />
                  Peso
                </span>
                <span className="data-value">{profile.data?.pesoKg ?? '—'} kg</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-[var(--text-muted)]">
                  <Ruler className="size-4" />
                  Estatura
                </span>
                <span className="data-value">{profile.data?.estaturaCm ?? '—'} cm</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-[var(--text-muted)]">
                  <ShieldCheck className="size-4" />
                  Actualizado
                </span>
                <span>{formatDateTime(profile.data?.fechaActualizacion)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
      <section id="progress">
        <ProfileMeasurements />
      </section>
      <section className="grid gap-4" id="membership">
        <h2 className="text-2xl font-semibold">Mi membresía y accesos</h2>
        <MembershipExperience />
      </section>
    </div>
  );
}
