'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useId } from 'react';
import { useForm } from 'react-hook-form';
import { notify } from '@/shared/notifications';
import { z } from 'zod';
import { profileService } from '@/features/profile/services/profile-service';
import { workoutService } from '@/features/workouts/services/workout-service';
import { queryKeys } from '@/shared/api/query-keys';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/cn';
import { Field } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';

const schema = z.object({
  numeroSerie: z.number().int().min(1).max(100),
  pesoKg: z.number().min(0).max(2000),
  repeticiones: z.number().int().min(1).max(1000),
  rir: z.number().int().min(0).max(10),
  descansoSegAnterior: z.number().int().min(0).max(7200),
});
type FormValues = z.infer<typeof schema>;

/** Un ajuste de un toque. No es un botón: son modificadores del formulario, no la acción. */
function QuickChip({
  label,
  onClick,
}: Readonly<{ label: string; onClick: () => void }>) {
  return (
    <button
      className={cn(
        'rounded-full border border-[var(--border-subtle)] bg-[var(--surface-high)] px-3 py-1.5',
        'text-xs font-semibold text-[var(--text)] transition-colors hover:border-[var(--volt)]',
      )}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

export function SetEntryForm({
  workoutId,
  sessionExerciseId,
  nextSetNumber,
  lastSet,
}: Readonly<{
  workoutId: string;
  sessionExerciseId: string;
  nextSetNumber: number;
  /** Última serie registrada de este ejercicio en esta sesión, si hay alguna. */
  lastSet?: { pesoKg: number; repeticiones: number; rir: number };
}>) {
  const queryClient = useQueryClient();
  const account = useQuery({ queryKey: ['user', 'me'], queryFn: profileService.getUser });
  const weightIncrementKg = account.data?.pesoIncrementoKg ?? 2.5;
  /* `Field` pinta el <label> como HERMANO del input, no envolviéndolo: sin
     `htmlFor`/`id` no había asociación ninguna y un lector de pantalla anunciaba
     cuatro campos numéricos sin nombre. Es el formulario más usado de la
     aplicación —se registra cada serie por aquí—. `useId` porque se monta un
     formulario por ejercicio y un id fijo se repetiría en la misma página. */
  const fieldId = useId();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      numeroSerie: nextSetNumber,
      pesoKg: 0,
      repeticiones: 8,
      rir: 2,
      descansoSegAnterior: 90,
    },
  });
  const addSet = useMutation({
    mutationFn: (values: FormValues) => workoutService.addSet(sessionExerciseId, values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.workout(workoutId) });
      notify.success('Serie registrada.');
    },
    onError: (error: Error) => form.setError('root', { message: error.message }),
  });
  return (
    <form
      className="grid gap-3 border-t border-[var(--border-subtle)] bg-[var(--surface-lowest)] p-4"
      onSubmit={form.handleSubmit((values) => addSet.mutate(values))}
    >
      <div className="flex flex-wrap gap-2">
        {lastSet ? (
          <QuickChip
            label="Igual que la anterior"
            onClick={() => {
              form.setValue('pesoKg', lastSet.pesoKg);
              form.setValue('repeticiones', lastSet.repeticiones);
              form.setValue('rir', lastSet.rir);
            }}
          />
        ) : null}
        <QuickChip
          label={`+${weightIncrementKg.toLocaleString('es-ES')} kg`}
          onClick={() => form.setValue('pesoKg', form.getValues('pesoKg') + weightIncrementKg)}
        />
        <QuickChip
          label={`−${weightIncrementKg.toLocaleString('es-ES')} kg`}
          onClick={() =>
            form.setValue('pesoKg', Math.max(0, form.getValues('pesoKg') - weightIncrementKg))
          }
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-5 sm:items-end">
        <Field
          error={form.formState.errors.numeroSerie?.message}
          htmlFor={`${fieldId}-serie`}
          label="Serie"
        >
          <Input
            id={`${fieldId}-serie`}
            inputMode="numeric"
            type="number"
            {...form.register('numeroSerie', { valueAsNumber: true })}
          />
        </Field>
        <Field
          error={form.formState.errors.pesoKg?.message}
          htmlFor={`${fieldId}-peso`}
          label="KG"
        >
          <Input
            id={`${fieldId}-peso`}
            inputMode="decimal"
            min="0"
            step="0.25"
            type="number"
            {...form.register('pesoKg', { valueAsNumber: true })}
          />
        </Field>
        <Field
          error={form.formState.errors.repeticiones?.message}
          htmlFor={`${fieldId}-reps`}
          label="Reps"
        >
          <Input
            id={`${fieldId}-reps`}
            inputMode="numeric"
            min="1"
            type="number"
            {...form.register('repeticiones', { valueAsNumber: true })}
          />
        </Field>
        <Field
          error={form.formState.errors.rir?.message}
          htmlFor={`${fieldId}-rir`}
          label="RIR"
        >
          <Input
            id={`${fieldId}-rir`}
            inputMode="numeric"
            max="10"
            min="0"
            type="number"
            {...form.register('rir', { valueAsNumber: true })}
          />
        </Field>
        <Button loading={addSet.isPending} type="submit" variant="primary">
          <Plus className="size-4" />
          Registrar
        </Button>
        {form.formState.errors.root?.message ? (
          <p className="text-sm text-[var(--danger-text)] sm:col-span-5" role="alert">
            {form.formState.errors.root.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
