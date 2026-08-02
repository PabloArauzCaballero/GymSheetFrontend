'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Play, Trash2, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { isStaff } from '@gymsheet/domain';
import { trainingService } from '@/features/training/services/training-service';
import type { UserRole } from '@/shared/api/contracts';
import { queryKeys } from '@/shared/api/query-keys';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { LoadingPanel } from '@/shared/components/feedback/loading-panel';
import { PageHeader } from '@/shared/components/layout/page-header';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogTrigger } from '@/shared/components/ui/dialog';
import { Field } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';

const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export function RoutineDetailClient({ id, role }: Readonly<{ id: string; role: UserRole }>) {
  const staff = isStaff(role);
  const router = useRouter();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: queryKeys.routine(id), queryFn: () => trainingService.get(id) });
  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.routine(id) });

  const [exName, setExName] = useState('');
  const [assignOpen, setAssignOpen] = useState(false);
  const [clientId, setClientId] = useState('');
  const [scheduledFor, setScheduledFor] = useState('');
  const [weekdays, setWeekdays] = useState<number[]>([]);

  const addExercise = useMutation({
    mutationFn: (order: number) =>
      trainingService.addExercise(id, { ejercicioNombre: exName.trim(), orden: order, seriesObjetivo: 3 }),
    onSuccess: async () => {
      await refresh();
      setExName('');
      toast.success('Ejercicio agregado.');
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const removeExercise = useMutation({
    mutationFn: (routineExerciseId: string) => trainingService.removeExercise(routineExerciseId),
    onSuccess: async () => {
      await refresh();
      toast.success('Ejercicio quitado.');
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const start = useMutation({
    mutationFn: () => trainingService.start(id),
    onSuccess: (workout) => {
      toast.success('Sesión iniciada desde la rutina.');
      router.push(`/workouts/${workout.id}`);
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const assign = useMutation({
    mutationFn: () =>
      trainingService.assign(id, {
        clienteUsuarioId: clientId.trim(),
        fechaProgramada: scheduledFor || null,
        diasSemana: weekdays,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.coachAssignments });
      setAssignOpen(false);
      setClientId('');
      setScheduledFor('');
      setWeekdays([]);
      toast.success('Rutina asignada al cliente.');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (query.isLoading) return <LoadingPanel rows={6} />;
  if (query.isError || !query.data)
    return <ErrorPanel message={query.error?.message ?? 'Rutina no encontrada.'} onRetry={() => query.refetch()} />;

  const routine = query.data;
  const nextOrder = Math.max(0, ...routine.ejercicios.map((item) => item.orden)) + 1;
  const owner = routine.creadoPorUsuarioId;

  return (
    <div className="grid gap-8">
      <PageHeader
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={routine.ejercicios.length === 0}
              loading={start.isPending}
              onClick={() => start.mutate()}
              variant="primary"
            >
              <Play className="size-4" />
              Empezar entreno
            </Button>
            {staff ? (
              <Dialog onOpenChange={setAssignOpen} open={assignOpen}>
                <DialogTrigger asChild>
                  <Button variant="secondary">
                    <UserPlus className="size-4" />
                    Asignar a cliente
                  </Button>
                </DialogTrigger>
                <DialogContent
                  description="Asigna esta rutina a un cliente. Puedes programar una fecha y/o días de la semana."
                  title="Asignar rutina"
                >
                  <div className="grid gap-5">
                    <Field htmlFor="client-id" label="ID de usuario del cliente">
                      <Input
                        id="client-id"
                        onChange={(event) => setClientId(event.target.value)}
                        placeholder="UUID del cliente"
                        value={clientId}
                      />
                    </Field>
                    <Field htmlFor="scheduled-for" label="Fecha programada (opcional)">
                      <Input
                        id="scheduled-for"
                        onChange={(event) => setScheduledFor(event.target.value)}
                        type="date"
                        value={scheduledFor}
                      />
                    </Field>
                    <Field htmlFor="weekdays" label="Días de la semana (opcional)">
                      <div className="flex flex-wrap gap-2" id="weekdays">
                        {WEEKDAYS.map((label, day) => {
                          const active = weekdays.includes(day);
                          return (
                            <button
                              className={`min-h-9 rounded-[6px] border px-3 text-sm ${active ? 'border-[var(--volt)] bg-[var(--surface-high)] text-white' : 'border-[var(--border-subtle)] text-[var(--text-muted)]'}`}
                              key={label}
                              onClick={() =>
                                setWeekdays((current) =>
                                  current.includes(day)
                                    ? current.filter((value) => value !== day)
                                    : [...current, day],
                                )
                              }
                              type="button"
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </Field>
                    <div className="flex justify-end gap-2">
                      <DialogClose asChild>
                        <Button type="button" variant="ghost">
                          Cancelar
                        </Button>
                      </DialogClose>
                      <Button
                        disabled={clientId.trim().length < 10}
                        loading={assign.isPending}
                        onClick={() => assign.mutate()}
                        variant="primary"
                      >
                        Asignar
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            ) : null}
          </div>
        }
        description={routine.descripcion ?? 'Sin descripción.'}
        eyebrow={`${routine.visibilidad} · ${routine.objetivo ?? 'objetivo libre'}`}
        title={routine.nombre}
      />

      <section className="panel overflow-hidden">
        <div className="border-b border-[var(--border-subtle)] p-5">
          <h2 className="text-lg font-bold">Ejercicios ({routine.ejercicios.length})</h2>
        </div>
        {routine.ejercicios.length ? (
          <ul className="divide-y divide-[var(--border-subtle)]">
            {routine.ejercicios.map((item) => (
              <li className="flex items-center gap-4 p-4" key={item.id}>
                <span className="grid size-8 shrink-0 place-items-center rounded-[6px] border border-[var(--border-subtle)] text-sm font-bold text-[var(--volt)]">
                  {item.orden}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{item.ejercicio?.nombre ?? 'Ejercicio'}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {item.seriesObjetivo} series
                    {item.repsMin ? ` · ${item.repsMin}-${item.repsMax ?? item.repsMin} reps` : ''}
                    {item.descansoSeg ? ` · ${item.descansoSeg}s descanso` : ''}
                  </p>
                </div>
                <Button
                  aria-label="Quitar ejercicio"
                  loading={removeExercise.isPending}
                  onClick={() => removeExercise.mutate(item.id)}
                  size="icon"
                  variant="ghost"
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="p-5 text-sm text-[var(--text-muted)]">Aún no hay ejercicios en esta rutina.</p>
        )}
        <form
          className="flex flex-wrap items-end gap-3 border-t border-[var(--border-subtle)] bg-[#080808] p-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (exName.trim().length >= 2) addExercise.mutate(nextOrder);
          }}
        >
          <Field className="flex-1" htmlFor="exercise-name" label="Agregar ejercicio (por nombre)">
            <Input
              id="exercise-name"
              list="routine-owner"
              onChange={(event) => setExName(event.target.value)}
              placeholder="Ej. Press banca"
              value={exName}
            />
          </Field>
          <Button loading={addExercise.isPending} type="submit" variant="secondary">
            Agregar
          </Button>
        </form>
      </section>

      <p className="text-xs text-[var(--text-disabled)]">Rutina de {owner}</p>
    </div>
  );
}
