'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ruler, Save, Scale, ShieldCheck, UserRound } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { profileService } from '@/features/profile/services/profile-service';
import { onboardingService } from '@/features/onboarding/services/onboarding-service';
import { MembershipExperience } from '@/features/membership/components/membership-experience';
import { ApiError } from '@/shared/api/api-error';
import { trainingGoals } from '@/shared/api/contracts';
import { queryKeys } from '@/shared/api/query-keys';
import { LoadingPanel } from '@/shared/components/feedback/loading-panel';
import { PageHeader } from '@/shared/components/layout/page-header';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import { Field } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import { Select } from '@/shared/components/ui/select';
import { formatDateTime } from '@/shared/lib/date';

const schema = z.object({
  edad: z.number().int().min(12).max(100),
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
    defaultValues: { edad: 18, pesoKg: 70, estaturaCm: 170, objetivo: 'SALUD_GENERAL' },
  });
  const measurements = useQuery({
    queryKey: queryKeys.bodyMeasurements,
    queryFn: onboardingService.measurements,
  });
  useEffect(() => {
    if (profile.data)
      form.reset({
        edad: profile.data.edad ?? 18,
        pesoKg: profile.data.pesoKg,
        estaturaCm: profile.data.estaturaCm,
        objetivo: profile.data.objetivo,
      });
  }, [form, profile.data]);
  const save = useMutation({
    mutationFn: (values: FormValues) =>
      profile.data ? profileService.updateProfile(values) : profileService.createProfile(values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.profile });
      toast.success('Perfil actualizado.');
    },
    onError: (error: Error) => form.setError('root', { message: error.message }),
  });
  if (profile.isLoading || user.isLoading) return <LoadingPanel rows={6} />;

  return (
    <div className="grid gap-8">
      <PageHeader
        description="Datos antropométricos propios con unidades canónicas del backend: kilogramos y centímetros."
        eyebrow="Cuenta"
        title="Perfil"
      />
      <nav aria-label="Secciones del perfil" className="flex gap-2 overflow-x-auto pb-2 text-sm">
        <a
          className="whitespace-nowrap rounded-full border border-[var(--border-subtle)] px-4 py-2"
          href="#personal"
        >
          Información personal
        </a>
        <a
          className="whitespace-nowrap rounded-full border border-[var(--border-subtle)] px-4 py-2"
          href="#progress"
        >
          Progreso corporal
        </a>
        <a
          className="whitespace-nowrap rounded-full border border-[var(--border-subtle)] px-4 py-2"
          href="#membership"
        >
          Mi membresía y accesos
        </a>
      </nav>
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]" id="personal">
        <form onSubmit={form.handleSubmit((values) => save.mutate(values))}>
          <Card>
            <CardHeader
              description="Estos valores son utilizados por el dominio para describir tu perfil, no para emitir diagnóstico médico."
              title="Datos antropométricos"
            />
            <CardContent className="grid gap-5 sm:grid-cols-2">
              <Field error={form.formState.errors.edad?.message} htmlFor="edad" label="Edad">
                <Input
                  id="edad"
                  max="100"
                  min="12"
                  type="number"
                  {...form.register('edad', { valueAsNumber: true })}
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
          <Card>
            <CardHeader title="Identidad" />
            <CardContent className="grid gap-4">
              <div className="flex items-center gap-3">
                <UserRound className="size-5 text-[var(--accent-ink)]" />
                <div>
                  <p className="font-semibold">{user.data?.nombreCompleto ?? 'Usuario'}</p>
                  <p className="text-sm text-[var(--text-muted)]">{user.data?.email}</p>
                </div>
              </div>
              <div className="flex justify-between border-t border-[var(--border-subtle)] pt-4">
                <span className="text-sm text-[var(--text-muted)]">Rol</span>
                <Badge>{user.data?.rol ?? '—'}</Badge>
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
        <Card>
          <CardHeader
            description="Cada registro se conserva; actualizar el peso no borra mediciones anteriores."
            title="Progreso corporal"
          />
          <CardContent>
            {measurements.isLoading ? (
              <LoadingPanel rows={3} />
            ) : measurements.data?.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr>
                      <th className="pb-3">Fecha</th>
                      <th className="pb-3">Peso</th>
                      <th className="pb-3">Origen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {measurements.data.map((item) => (
                      <tr className="border-t border-[var(--border-subtle)]" key={item.id}>
                        <td className="py-3">{item.measuredOn}</td>
                        <td>
                          {item.weight} {item.unit}
                        </td>
                        <td>{item.source}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-[var(--text-muted)]">Aún no hay mediciones guardadas.</p>
            )}
          </CardContent>
        </Card>
      </section>
      <section className="grid gap-4" id="membership">
        <h2 className="text-2xl font-bold">Mi membresía y accesos</h2>
        <MembershipExperience />
      </section>
    </div>
  );
}
