'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, Dumbbell } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import {
  cleanOptional,
  emptyExerciseFormValues,
  exerciseFormSchema,
  type ExerciseFormValues,
} from './exercise-form-model';
import { exerciseService } from '@/features/exercises/services/exercise-service';
import { queryKeys } from '@/shared/api/query-keys';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { LoadingPanel } from '@/shared/components/feedback/loading-panel';
import { PageHeader } from '@/shared/components/layout/page-header';
import { Button, ButtonLink } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import { Field } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';

export function ExerciseForm({
  exerciseId,
  currentUserId,
}: Readonly<{ exerciseId?: string; currentUserId?: string }>) {
  const editing = Boolean(exerciseId);
  const router = useRouter();
  const queryClient = useQueryClient();
  const equipment = useQuery({
    queryKey: queryKeys.equipment,
    queryFn: exerciseService.listEquipment,
  });
  const existing = useQuery({
    queryKey: ['exercise', exerciseId],
    queryFn: () => exerciseService.get(exerciseId ?? ''),
    enabled: editing,
  });
  const form = useForm<ExerciseFormValues>({
    resolver: zodResolver(exerciseFormSchema),
    defaultValues: emptyExerciseFormValues,
  });
  const selectedEquipmentIds = useWatch({ control: form.control, name: 'equipoIds' });

  useEffect(() => {
    const item = existing.data;
    if (!item) return;
    form.reset({
      nombre: item.nombre,
      grupoMuscular: item.grupoMuscular,
      descripcion: item.descripcion ?? '',
      bodyPart: item.bodyPart ?? '',
      targetMuscle: item.targetMuscle ?? '',
      synergistMuscleGroup: item.synergistMuscleGroup ?? '',
      secondaryMusclesText: item.secondaryMuscles.join(', '),
      instructionsText: item.instructions['es-BO'] ?? item.instructions.es ?? '',
      stepsText: (item.instructionSteps['es-BO'] ?? item.instructionSteps.es ?? []).join('\n'),
      equipoIds: item.equipment.map((entry) => entry.id),
    });
  }, [existing.data, form]);

  const save = useMutation({
    mutationFn: (input: Parameters<typeof exerciseService.createPersonal>[0]) =>
      exerciseId
        ? exerciseService.updatePersonal(exerciseId, input)
        : exerciseService.createPersonal(input),
    onSuccess: async (saved) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['exercises'] }),
        queryClient.invalidateQueries({ queryKey: ['exercise', saved.id] }),
      ]);
      toast.success(editing ? 'Ejercicio actualizado.' : 'Ejercicio personal creado.');
      router.replace(`/exercises/${saved.id}`);
    },
    onError: (error: Error) => form.setError('root', { message: error.message }),
  });

  function submit(values: ExerciseFormValues) {
    const secondaryMuscles =
      values.secondaryMusclesText
        ?.split(',')
        .map((item) => item.trim())
        .filter(Boolean) ?? [];
    const steps =
      values.stepsText
        ?.split('\n')
        .map((item) => item.trim())
        .filter(Boolean) ?? [];
    save.mutate({
      nombre: values.nombre.trim(),
      grupoMuscular: values.grupoMuscular.trim(),
      descripcion: cleanOptional(values.descripcion),
      bodyPart: cleanOptional(values.bodyPart),
      targetMuscle: cleanOptional(values.targetMuscle),
      synergistMuscleGroup: cleanOptional(values.synergistMuscleGroup),
      secondaryMuscles,
      equipoIds: values.equipoIds,
      instructions: values.instructionsText?.trim()
        ? { 'es-BO': values.instructionsText.trim() }
        : {},
      instructionSteps: steps.length ? { 'es-BO': steps } : {},
      metadata: existing.data?.metadata ?? {},
    });
  }

  if (equipment.isLoading || (editing && existing.isLoading)) return <LoadingPanel rows={6} />;
  if (equipment.isError)
    return <ErrorPanel message={equipment.error.message} onRetry={() => equipment.refetch()} />;
  if (editing && (existing.isError || !existing.data)) {
    return (
      <ErrorPanel
        message={existing.error?.message ?? 'Ejercicio no encontrado.'}
        onRetry={() => existing.refetch()}
      />
    );
  }
  if (
    editing &&
    (existing.data?.tipoEjercicio !== 'PERSONAL' ||
      existing.data.createdByUsuarioId !== currentUserId)
  ) {
    return <ErrorPanel message="Solo puedes editar ejercicios personales de tu propiedad." />;
  }

  return (
    <div className="grid gap-8">
      <PageHeader
        actions={
          <ButtonLink href={exerciseId ? `/exercises/${exerciseId}` : '/exercises'} variant="ghost">
            <ArrowLeft className="size-4" />
            Cancelar
          </ButtonLink>
        }
        description="Registra únicamente información verificable. Los campos avanzados son opcionales."
        eyebrow="Catálogo personal"
        title={editing ? 'Editar ejercicio' : 'Nuevo ejercicio'}
      />
      <form
        className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]"
        onSubmit={form.handleSubmit(submit)}
      >
        <Card>
          <CardHeader
            description="Identidad y objetivo biomecánico del ejercicio."
            title="Información principal"
          />
          <CardContent className="grid gap-5 sm:grid-cols-2">
            <Field
              className="sm:col-span-2"
              error={form.formState.errors.nombre?.message}
              htmlFor="nombre"
              label="Nombre"
            >
              <Input
                id="nombre"
                placeholder="Ej. Press inclinado con mancuernas"
                {...form.register('nombre')}
              />
            </Field>
            <Field
              error={form.formState.errors.grupoMuscular?.message}
              htmlFor="grupoMuscular"
              label="Grupo muscular"
            >
              <Input id="grupoMuscular" placeholder="Pecho" {...form.register('grupoMuscular')} />
            </Field>
            <Field htmlFor="bodyPart" label="Parte corporal">
              <Input id="bodyPart" placeholder="Torso" {...form.register('bodyPart')} />
            </Field>
            <Field htmlFor="targetMuscle" label="Músculo objetivo">
              <Input
                id="targetMuscle"
                placeholder="Pectoral superior"
                {...form.register('targetMuscle')}
              />
            </Field>
            <Field htmlFor="synergistMuscleGroup" label="Grupo sinergista">
              <Input
                id="synergistMuscleGroup"
                placeholder="Tríceps"
                {...form.register('synergistMuscleGroup')}
              />
            </Field>
            <Field className="sm:col-span-2" htmlFor="descripcion" label="Descripción">
              <Textarea
                id="descripcion"
                placeholder="Cuándo y por qué usar este ejercicio."
                {...form.register('descripcion')}
              />
            </Field>
            <Field
              className="sm:col-span-2"
              hint="Separa cada músculo con una coma."
              htmlFor="secondaryMusclesText"
              label="Músculos secundarios"
            >
              <Input
                id="secondaryMusclesText"
                placeholder="Deltoides anterior, tríceps"
                {...form.register('secondaryMusclesText')}
              />
            </Field>
            <Field className="sm:col-span-2" htmlFor="instructionsText" label="Instrucciones">
              <Textarea
                id="instructionsText"
                placeholder="Describe la ejecución de forma clara."
                {...form.register('instructionsText')}
              />
            </Field>
            <Field
              className="sm:col-span-2"
              hint="Una instrucción por línea."
              htmlFor="stepsText"
              label="Pasos"
            >
              <Textarea
                id="stepsText"
                placeholder={
                  'Ajusta el banco.\nRetrae las escápulas.\nControla la fase excéntrica.'
                }
                {...form.register('stepsText')}
              />
            </Field>
          </CardContent>
        </Card>
        <div className="grid content-start gap-5">
          <Card>
            <CardHeader
              description="Selecciona hasta 30 equipos existentes."
              title="Equipamiento"
            />
            <CardContent className="grid max-h-96 gap-2 overflow-y-auto">
              {equipment.data?.map((item) => {
                const selected = selectedEquipmentIds.includes(item.id);
                return (
                  <label
                    className="flex cursor-pointer items-center justify-between gap-3 rounded-[4px] border border-[var(--border-subtle)] bg-[var(--surface-low)] p-3 hover:border-[var(--border)]"
                    key={item.id}
                  >
                    <span>
                      <span className="text-sm font-semibold">{item.nombre}</span>
                      <span className="mt-1 block text-xs text-[var(--text-muted)]">
                        {item.tipo}
                      </span>
                    </span>
                    <input
                      className="sr-only"
                      type="checkbox"
                      value={item.id}
                      {...form.register('equipoIds')}
                    />
                    <span
                      className={`grid size-6 place-items-center rounded-[4px] border ${selected ? 'border-[var(--volt)] bg-[var(--volt)] text-black' : 'border-[var(--border)]'}`}
                    >
                      {selected ? <Check className="size-4" /> : null}
                    </span>
                  </label>
                );
              })}
            </CardContent>
          </Card>
          {form.formState.errors.root?.message ? (
            <p
              className="rounded-[4px] border border-[#63302c] bg-[#160c0b] p-3 text-sm text-[#ffb4ab]"
              role="alert"
            >
              {form.formState.errors.root.message}
            </p>
          ) : null}
          <Button loading={save.isPending} size="lg" type="submit" variant="primary">
            <Dumbbell className="size-4" />
            {editing ? 'Guardar cambios' : 'Guardar ejercicio'}
          </Button>
        </div>
      </form>
    </div>
  );
}
