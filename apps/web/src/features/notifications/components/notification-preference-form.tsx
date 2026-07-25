'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { notificationService } from '@/features/notifications/services/notification-service';
import type { NotificationPreference } from '@/shared/api/contracts';
import { queryKeys } from '@/shared/api/query-keys';
import { Button } from '@/shared/components/ui/button';
import { Field } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import { Select } from '@/shared/components/ui/select';

const schema = z
  .object({
    recordatoriosVencimiento: z.boolean(),
    canalPreferido: z.enum(['IN_APP', 'HTTP_GATEWAY']),
    consentimientoExternoEn: z.string().optional(),
    versionConsentimiento: z.string().max(80).optional(),
    horaSilencioInicio: z.string().optional(),
    horaSilencioFin: z.string().optional(),
  })
  .superRefine((input, context) => {
    if (
      input.canalPreferido === 'HTTP_GATEWAY' &&
      (!input.consentimientoExternoEn || !input.versionConsentimiento)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['versionConsentimiento'],
        message: 'El canal externo requiere consentimiento y versión.',
      });
    }
    if (Boolean(input.horaSilencioInicio) !== Boolean(input.horaSilencioFin)) {
      context.addIssue({
        code: 'custom',
        path: ['horaSilencioFin'],
        message: 'Configura ambas horas de silencio.',
      });
    }
  });
type FormValues = z.infer<typeof schema>;

function toLocalDateTime(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export function NotificationPreferenceForm({
  preference,
}: Readonly<{ preference: NotificationPreference }>) {
  const queryClient = useQueryClient();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      recordatoriosVencimiento: true,
      canalPreferido: 'IN_APP',
      consentimientoExternoEn: '',
      versionConsentimiento: '',
      horaSilencioInicio: '',
      horaSilencioFin: '',
    },
  });
  useEffect(() => {
    form.reset({
      recordatoriosVencimiento: preference.recordatoriosVencimiento,
      canalPreferido: preference.canalPreferido,
      consentimientoExternoEn: toLocalDateTime(preference.consentimientoExternoEn),
      versionConsentimiento: preference.versionConsentimiento ?? '',
      horaSilencioInicio: preference.horaSilencioInicio ?? '',
      horaSilencioFin: preference.horaSilencioFin ?? '',
    });
  }, [form, preference]);
  const update = useMutation({
    mutationFn: (values: FormValues) =>
      notificationService.updatePreference({
        recordatoriosVencimiento: values.recordatoriosVencimiento,
        canalPreferido: values.canalPreferido,
        consentimientoExternoEn: values.consentimientoExternoEn
          ? new Date(values.consentimientoExternoEn).toISOString()
          : null,
        versionConsentimiento: values.versionConsentimiento?.trim() || null,
        horaSilencioInicio: values.horaSilencioInicio || null,
        horaSilencioFin: values.horaSilencioFin || null,
        metadata: {},
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.notificationPreference });
      toast.success('Preferencias actualizadas.');
    },
    onError: (error: Error) => form.setError('root', { message: error.message }),
  });
  const channel = useWatch({ control: form.control, name: 'canalPreferido' });
  return (
    <form className="grid gap-5" onSubmit={form.handleSubmit((values) => update.mutate(values))}>
      <label className="flex items-center justify-between gap-4 rounded-[4px] border border-[var(--border-subtle)] bg-[var(--surface-low)] p-4">
        <span>
          <span className="block font-semibold">Recordatorios de vencimiento</span>
          <span className="mt-1 block text-xs leading-5 text-[var(--text-muted)]">
            Permite generar avisos según la configuración del plan.
          </span>
        </span>
        <input
          className="size-5 accent-[var(--volt)]"
          type="checkbox"
          {...form.register('recordatoriosVencimiento')}
        />
      </label>
      <Field htmlFor="canalPreferido" label="Canal preferido">
        <Select id="canalPreferido" {...form.register('canalPreferido')}>
          <option value="IN_APP">Dentro de la aplicación</option>
          <option value="HTTP_GATEWAY">Canal externo HTTP</option>
        </Select>
      </Field>
      {channel === 'HTTP_GATEWAY' ? (
        <div className="grid gap-5 rounded-[4px] border border-[var(--border)] p-4">
          <Field
            error={form.formState.errors.consentimientoExternoEn?.message}
            htmlFor="consentimientoExternoEn"
            label="Consentimiento registrado en"
          >
            <Input
              id="consentimientoExternoEn"
              type="datetime-local"
              {...form.register('consentimientoExternoEn')}
            />
          </Field>
          <Field
            error={form.formState.errors.versionConsentimiento?.message}
            htmlFor="versionConsentimiento"
            label="Versión de consentimiento"
          >
            <Input
              id="versionConsentimiento"
              placeholder="v1.0"
              {...form.register('versionConsentimiento')}
            />
          </Field>
        </div>
      ) : null}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field htmlFor="horaSilencioInicio" label="Silencio desde">
          <Input id="horaSilencioInicio" type="time" {...form.register('horaSilencioInicio')} />
        </Field>
        <Field
          error={form.formState.errors.horaSilencioFin?.message}
          htmlFor="horaSilencioFin"
          label="Silencio hasta"
        >
          <Input id="horaSilencioFin" type="time" {...form.register('horaSilencioFin')} />
        </Field>
      </div>
      {form.formState.errors.root?.message ? (
        <p className="text-sm text-[#ffb4ab]" role="alert">
          {form.formState.errors.root.message}
        </p>
      ) : null}
      <Button loading={update.isPending} type="submit" variant="primary">
        Guardar preferencias
      </Button>
    </form>
  );
}
