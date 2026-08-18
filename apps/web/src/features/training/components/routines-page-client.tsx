'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, Plus, Users } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { notify } from '@/shared/notifications';
import { z } from 'zod';
import { isStaff } from '@gymsheet/domain';
import { trainingService } from '@/features/training/services/training-service';
import { routineVisibilities, trainingGoals, type UserRole } from '@/shared/api/contracts';
import { queryKeys } from '@/shared/api/query-keys';
import { EmptyState } from '@/shared/components/feedback/empty-state';
import { LoadingPanel } from '@/shared/components/feedback/loading-panel';
import { PageHeader } from '@/shared/components/layout/page-header';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogTrigger } from '@/shared/components/ui/dialog';
import { Field } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import { Select } from '@/shared/components/ui/select';
import { Textarea } from '@/shared/components/ui/textarea';
import { RoutineImportDialog } from './routine-import-dialog';

const schema = z.object({
  nombre: z.string().trim().min(2).max(160),
  descripcion: z.string().trim().max(4000).optional(),
  visibilidad: z.enum(routineVisibilities),
  objetivo: z.enum(trainingGoals).or(z.literal('')).optional(),
});
type FormValues = z.infer<typeof schema>;

export function RoutinesPageClient({ role }: Readonly<{ role: UserRole }>) {
  const staff = isStaff(role);
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const mine = useQuery({ queryKey: queryKeys.routines('mine'), queryFn: () => trainingService.list('mine') });
  const templates = useQuery({
    queryKey: queryKeys.routines('templates'),
    queryFn: () => trainingService.list('templates'),
  });
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { nombre: '', descripcion: '', visibilidad: 'PRIVATE', objetivo: '' },
  });
  const create = useMutation({
    mutationFn: (values: FormValues) =>
      trainingService.create({
        nombre: values.nombre,
        descripcion: values.descripcion?.trim() || null,
        visibilidad: values.visibilidad,
        objetivo: values.objetivo ? values.objetivo : null,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.routines('mine') });
      form.reset();
      setOpen(false);
      notify.success('Rutina creada.');
    },
    onError: (error: Error) => form.setError('root', { message: error.message }),
  });

  if (mine.isLoading) return <LoadingPanel rows={6} />;
  const routines = mine.data?.items ?? [];
  const templateItems = templates.data?.items ?? [];

  return (
    <div className="grid gap-8">
      <PageHeader
        tutorialId="page:routines"
        actions={
          <div className="flex flex-wrap gap-2" data-tutorial-id="routines:actions">
            <RoutineImportDialog />
            <Dialog onOpenChange={setOpen} open={open}>
              <DialogTrigger asChild>
                <Button variant="primary">
                  <Plus className="size-4" />
                  Nueva rutina
                </Button>
              </DialogTrigger>
              <DialogContent
                description="Define un plan reutilizable. Luego agrégale ejercicios y, si eres coach, asígnalo a un cliente."
                title="Crear rutina"
              >
                <form
                  className="grid gap-5"
                  onSubmit={form.handleSubmit((values) => create.mutate(values))}
                >
                  <Field error={form.formState.errors.nombre?.message} htmlFor="routine-name" label="Nombre">
                    <Input id="routine-name" {...form.register('nombre')} />
                  </Field>
                  <Field htmlFor="routine-desc" label="Descripción">
                    <Textarea id="routine-desc" {...form.register('descripcion')} />
                  </Field>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field htmlFor="routine-visibility" label="Visibilidad">
                      <Select id="routine-visibility" {...form.register('visibilidad')}>
                        <option value="PRIVATE">Privada</option>
                        <option value="SHARED">Compartida</option>
                        {staff ? <option value="TEMPLATE">Plantilla</option> : null}
                      </Select>
                    </Field>
                    <Field htmlFor="routine-goal" label="Objetivo">
                      <Select id="routine-goal" {...form.register('objetivo')}>
                        <option value="">Sin objetivo</option>
                        {trainingGoals.map((goal) => (
                          <option key={goal} value={goal}>
                            {goal}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  </div>
                  {form.formState.errors.root?.message ? (
                    <p className="text-sm text-[var(--danger-text)]">{form.formState.errors.root.message}</p>
                  ) : null}
                  <div className="flex justify-end gap-2">
                    <DialogClose asChild>
                      <Button type="button" variant="ghost">
                        Cancelar
                      </Button>
                    </DialogClose>
                    <Button loading={create.isPending} type="submit" variant="primary">
                      Crear
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        }
        description={
          staff
            ? 'Construye planes reutilizables y asígnalos a tus clientes con programación.'
            : 'Construye tus planes de entrenamiento reutilizables.'
        }
        eyebrow="Planes de entrenamiento"
        title="Rutinas"
      />

      {routines.length ? (
        <section className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {routines.map((routine) => (
            <Link
              className="panel hover-lift group flex flex-col gap-3 p-5"
              href={`/routines/${routine.id}`}
              key={routine.id}
            >
              <div className="flex items-start justify-between gap-3">
                <ClipboardList className="size-5 text-[var(--accent-ink)]" />
                <Badge tone={routine.visibilidad === 'TEMPLATE' ? 'info' : 'neutral'}>
                  {routine.visibilidad}
                </Badge>
              </div>
              <h2 className="text-lg font-bold tracking-[-0.02em] group-hover:text-[var(--accent-ink)]">
                {routine.nombre}
              </h2>
              <p className="line-clamp-2 min-h-10 text-sm text-[var(--text-muted)]">
                {routine.descripcion ?? 'Sin descripción.'}
              </p>
              <p className="text-xs text-[var(--text-disabled)]">
                {routine.ejercicios.length} ejercicios · {routine.objetivo ?? 'objetivo libre'}
              </p>
            </Link>
          ))}
        </section>
      ) : (
        <EmptyState
          description="Crea tu primera rutina o impórtalas de forma masiva por CSV/JSON."
          title="Aún no tienes rutinas"
        />
      )}

      {templateItems.length ? (
        <section className="grid gap-4">
          <div className="flex items-center gap-2">
            <Users className="size-4 text-[var(--text-muted)]" />
            <h2 className="data-label">Plantillas disponibles</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {templateItems.map((routine) => (
              <Link
                className="panel hover-lift flex flex-col gap-2 p-5"
                href={`/routines/${routine.id}`}
                key={routine.id}
              >
                <h3 className="font-bold">{routine.nombre}</h3>
                <p className="text-xs text-[var(--text-disabled)]">
                  {routine.ejercicios.length} ejercicios
                </p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
