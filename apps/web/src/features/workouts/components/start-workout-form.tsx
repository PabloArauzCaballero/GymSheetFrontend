'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Activity, ArrowLeft } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { workoutService } from '@/features/workouts/services/workout-service';
import { PageHeader } from '@/shared/components/layout/page-header';
import { Button, ButtonLink } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import { Field } from '@/shared/components/ui/field';
import { Textarea } from '@/shared/components/ui/textarea';

const schema = z.object({ observacion: z.string().trim().max(1000).optional() });
type FormValues = z.infer<typeof schema>;

export function StartWorkoutForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { observacion: '' },
  });
  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const session = await workoutService.start({
        observacion: values.observacion?.trim() || null,
      });
      const exerciseId = searchParams.get('exerciseId');
      if (exerciseId)
        await workoutService.addExercise(session.id, { ejercicioId: exerciseId, orden: 1 });
      return session;
    },
    onSuccess: async (session) => {
      await queryClient.invalidateQueries({ queryKey: ['workouts'] });
      router.replace(`/workouts/${session.id}`);
    },
    onError: (error: Error) => form.setError('root', { message: error.message }),
  });

  return (
    <div className="grid gap-8">
      <PageHeader
        actions={
          <ButtonLink href="/workouts" variant="ghost">
            <ArrowLeft className="size-4" />
            Cancelar
          </ButtonLink>
        }
        description="El backend permite una sola sesión en progreso por usuario."
        eyebrow="Entrenamiento en vivo"
        title="Iniciar sesión"
      />
      <form
        className="mx-auto grid w-full max-w-2xl gap-5"
        onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
      >
        <Card>
          <CardHeader
            description="La observación es opcional y puede utilizarse para registrar el enfoque del día."
            title="Contexto de sesión"
          />
          <CardContent>
            <Field
              error={form.formState.errors.observacion?.message}
              htmlFor="observacion"
              label="Observación"
            >
              <Textarea
                id="observacion"
                placeholder="Ej. Día de fuerza, énfasis en técnica y control excéntrico."
                {...form.register('observacion')}
              />
            </Field>
          </CardContent>
        </Card>
        {form.formState.errors.root?.message ? (
          <p
            className="rounded-[4px] border border-[var(--danger-border)] bg-[var(--danger-surface)] p-3 text-sm text-[var(--danger-text)]"
            role="alert"
          >
            {form.formState.errors.root.message}
          </p>
        ) : null}
        <Button loading={mutation.isPending} size="lg" type="submit" variant="primary">
          <Activity className="size-5" />
          Iniciar entrenamiento
        </Button>
      </form>
    </div>
  );
}
