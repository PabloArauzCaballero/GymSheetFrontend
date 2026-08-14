'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Database, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { confirm, notify } from '@/shared/notifications';
import { z } from 'zod';
import { exerciseAdminService } from '@/features/admin/services/exercise-admin-service';
import { exerciseService } from '@/features/exercises/services/exercise-service';
import { GlobalExerciseEditButton } from './global-exercise-edit-button';
import { queryKeys } from '@/shared/api/query-keys';
import { EmptyState } from '@/shared/components/feedback/empty-state';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { LoadingPanel } from '@/shared/components/feedback/loading-panel';
import { PageHeader } from '@/shared/components/layout/page-header';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import { Dialog, DialogClose, DialogContent, DialogTrigger } from '@/shared/components/ui/dialog';
import { Field } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import { Table, TableCell, TableContainer, TableHead } from '@/shared/components/ui/table';
import { Textarea } from '@/shared/components/ui/textarea';

const createSchema = z.object({
  nombre: z.string().trim().min(2).max(160),
  grupoMuscular: z.string().trim().min(2).max(120),
  descripcion: z.string().trim().max(2000).optional(),
  bodyPart: z.string().trim().max(100).optional(),
  targetMuscle: z.string().trim().max(120).optional(),
});
type FormValues = z.infer<typeof createSchema>;

export function ExerciseAdmin() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const form = useForm<FormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      nombre: '',
      grupoMuscular: '',
      descripcion: '',
      bodyPart: '',
      targetMuscle: '',
    },
  });
  const query = useQuery({
    queryKey: queryKeys.exercises('admin-global'),
    queryFn: () => exerciseService.list({ page: 1, pageSize: 100 }),
  });
  const globals = query.data?.items.filter((item) => item.tipoEjercicio === 'GLOBAL') ?? [];
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['exercises'] });
  const create = useMutation({
    mutationFn: (values: FormValues) =>
      exerciseAdminService.createGlobal({
        nombre: values.nombre,
        grupoMuscular: values.grupoMuscular,
        descripcion: values.descripcion?.trim() || null,
        bodyPart: values.bodyPart?.trim() || null,
        targetMuscle: values.targetMuscle?.trim() || null,
        equipoIds: [],
        secondaryMuscles: [],
        instructions: {},
        instructionSteps: {},
        metadata: {},
      }),
    onSuccess: async () => {
      await refresh();
      form.reset();
      setOpen(false);
      notify.success('Ejercicio global creado.');
    },
    onError: (error: Error) => form.setError('root', { message: error.message }),
  });
  const inactivate = useMutation({
    mutationFn: exerciseAdminService.inactivateGlobal,
    onSuccess: async () => {
      await refresh();
      notify.success('Ejercicio inactivado.');
    },
    onError: (error: Error) => notify.error(error),
  });
  const importDataset = useMutation({
    mutationFn: exerciseAdminService.importDataset,
    onSuccess: () => notify.success('Solicitud de importación procesada.'),
    onError: (error: Error) => notify.error(error),
  });
  if (query.isLoading) return <LoadingPanel rows={7} />;
  return (
    <div className="grid gap-8">
      <PageHeader
        actions={
          <>
            <Button
              loading={importDataset.isPending}
              onClick={() => importDataset.mutate({ dryRun: true, importMedia: false })}
            >
              <Database className="size-4" />
              Dry run dataset
            </Button>
            <Dialog onOpenChange={setOpen} open={open}>
              <DialogTrigger asChild>
                <Button variant="primary">
                  <Plus className="size-4" />
                  Ejercicio global
                </Button>
              </DialogTrigger>
              <DialogContent
                description="Alta mínima. Los campos avanzados pueden completarse desde el detalle personal cuando el backend exponga un editor administrativo equivalente."
                title="Nuevo ejercicio global"
              >
                <form
                  className="grid gap-5"
                  onSubmit={form.handleSubmit((values) => create.mutate(values))}
                >
                  <Field error={form.formState.errors.nombre?.message} label="Nombre">
                    <Input {...form.register('nombre')} />
                  </Field>
                  <Field
                    error={form.formState.errors.grupoMuscular?.message}
                    label="Grupo muscular"
                  >
                    <Input {...form.register('grupoMuscular')} />
                  </Field>
                  <Field label="Parte corporal">
                    <Input {...form.register('bodyPart')} />
                  </Field>
                  <Field label="Músculo objetivo">
                    <Input {...form.register('targetMuscle')} />
                  </Field>
                  <Field label="Descripción">
                    <Textarea {...form.register('descripcion')} />
                  </Field>
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
                      Guardar
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </>
        }
        description="Catálogo global y ejecución segura de la importación externa en modo de prueba. La importación real depende de la configuración de licencia del backend."
        eyebrow="Administración"
        title="Catálogo global"
      />
      <Card>
        <CardHeader
          description={`Se muestran hasta 100 ejercicios visibles; ${globals.length} son globales en esta página.`}
          title="Ejercicios globales"
        />
        <CardContent className="p-0">
          {query.isError ? (
            <div className="p-5">
              <ErrorPanel message={query.error.message} onRetry={() => query.refetch()} />
            </div>
          ) : globals.length ? (
            <TableContainer>
              <Table>
                <thead>
                  <tr>
                    <TableHead>Ejercicio</TableHead>
                    <TableHead>Grupo</TableHead>
                    <TableHead>Fuente</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </tr>
                </thead>
                <tbody>
                  {globals.map((item) => (
                    <tr key={item.id}>
                      <TableCell>
                        <p className="font-semibold">{item.nombre}</p>
                        <p className="mt-1 text-xs text-[var(--text-muted)]">
                          {item.targetMuscle ?? item.bodyPart ?? '—'}
                        </p>
                      </TableCell>
                      <TableCell>{item.grupoMuscular}</TableCell>
                      <TableCell>
                        <Badge>{item.dataSource}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge tone={item.estado === 'ACTIVO' ? 'success' : 'danger'}>
                          {item.estado}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <GlobalExerciseEditButton exercise={item} />
                          <Button
                            aria-label={`Inactivar ${item.nombre}`}
                            loading={inactivate.isPending}
                            onClick={async () => {
                              const result = await confirm({
                                title: 'Inactivar ejercicio',
                                message: `«${item.nombre}» dejará de estar disponible en el catálogo global.`,
                                severity: 'warning',
                                confirmLabel: 'Inactivar',
                              });
                              if (result.confirmed) inactivate.mutate(item.id);
                            }}
                            size="icon"
                            variant="ghost"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableContainer>
          ) : (
            <div className="p-5">
              <EmptyState
                description="No hay ejercicios globales visibles en la primera página del catálogo."
                title="Sin registros"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
