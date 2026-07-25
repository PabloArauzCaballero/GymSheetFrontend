'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { workoutService } from '@/features/workouts/services/workout-service';
import { queryKeys } from '@/shared/api/query-keys';
import { Button } from '@/shared/components/ui/button';
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

export function SetEntryForm({
  workoutId,
  sessionExerciseId,
  nextSetNumber,
}: Readonly<{ workoutId: string; sessionExerciseId: string; nextSetNumber: number }>) {
  const queryClient = useQueryClient();
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
      toast.success('Serie registrada.');
    },
    onError: (error: Error) => form.setError('root', { message: error.message }),
  });
  return (
    <form
      className="grid gap-3 border-t border-[var(--border-subtle)] bg-[#080808] p-4 sm:grid-cols-5 sm:items-end"
      onSubmit={form.handleSubmit((values) => addSet.mutate(values))}
    >
      <Field error={form.formState.errors.numeroSerie?.message} label="Serie">
        <Input
          inputMode="numeric"
          type="number"
          {...form.register('numeroSerie', { valueAsNumber: true })}
        />
      </Field>
      <Field error={form.formState.errors.pesoKg?.message} label="KG">
        <Input
          inputMode="decimal"
          min="0"
          step="0.25"
          type="number"
          {...form.register('pesoKg', { valueAsNumber: true })}
        />
      </Field>
      <Field error={form.formState.errors.repeticiones?.message} label="Reps">
        <Input
          inputMode="numeric"
          min="1"
          type="number"
          {...form.register('repeticiones', { valueAsNumber: true })}
        />
      </Field>
      <Field error={form.formState.errors.rir?.message} label="RIR">
        <Input
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
        <p className="text-sm text-[#ffb4ab] sm:col-span-5" role="alert">
          {form.formState.errors.root.message}
        </p>
      ) : null}
    </form>
  );
}
