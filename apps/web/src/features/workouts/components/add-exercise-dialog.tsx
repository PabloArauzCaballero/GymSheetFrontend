'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dumbbell, Plus, Search } from 'lucide-react';
import { useState, type CSSProperties } from 'react';
import { toast } from 'sonner';
import { exerciseService } from '@/features/exercises/services/exercise-service';
import { workoutService } from '@/features/workouts/services/workout-service';
import { queryKeys } from '@/shared/api/query-keys';
import { DomainImage } from '@/shared/components/media/domain-image';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogTrigger } from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value';

export function AddExerciseDialog({
  workoutId,
  nextOrder,
}: Readonly<{ workoutId: string; nextOrder: number }>) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const debounced = useDebouncedValue(search.trim(), 250);
  const queryClient = useQueryClient();
  const exercises = useQuery({
    queryKey: queryKeys.exercises(`dialog:${debounced}`),
    queryFn: () => exerciseService.list({ page: 1, pageSize: 20, search: debounced || undefined }),
    enabled: open,
  });
  const addExercise = useMutation({
    mutationFn: (exerciseId: string) =>
      workoutService.addExercise(workoutId, { ejercicioId: exerciseId, orden: nextOrder }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.workout(workoutId) });
      toast.success('Ejercicio agregado a la sesión.');
      setOpen(false);
      setSearch('');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button variant="primary">
          <Plus className="size-4" />
          Agregar ejercicio
        </Button>
      </DialogTrigger>
      <DialogContent
        description="Selecciona un ejercicio visible. Se agregará en el siguiente orden disponible."
        title="Agregar a la sesión"
      >
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-muted)]" />
          <Input
            autoFocus
            className="pl-10"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar ejercicio"
            value={search}
          />
        </div>
        <div className="scrollbar-thin stagger mt-4 grid max-h-[50dvh] gap-2 overflow-y-auto">
          {exercises.isLoading ? (
            <p className="animate-fade-in p-5 text-center text-sm text-[var(--text-muted)]">
              Cargando catálogo…
            </p>
          ) : exercises.data?.items.length ? (
            exercises.data.items.map((item, position) => {
              const media = item.media.find((entry) => entry.isPrimary) ?? item.media[0];
              const hasImage = media?.mediaType === 'IMAGE' || media?.mediaType === 'GIF';
              return (
                <button
                  className="pressable group flex items-center justify-between gap-3 rounded-[6px] border border-[var(--border-subtle)] bg-[var(--surface-low)] p-3 text-left hover:border-[var(--volt)] hover:bg-[var(--surface)]"
                  disabled={addExercise.isPending}
                  key={item.id}
                  onClick={() => addExercise.mutate(item.id)}
                  style={{ '--i': position } as CSSProperties}
                  type="button"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-[6px] border border-[var(--border)] bg-[var(--surface-lowest)]">
                      {hasImage ? (
                        <DomainImage
                          alt={media.altText}
                          className="size-full object-cover transition-transform duration-300 group-hover:scale-110"
                          fallbackSrc={media.url}
                          src={media.thumbnailUrl ?? media.url}
                        />
                      ) : (
                        <Dumbbell className="size-4 text-[var(--volt)]" />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{item.nombre}</span>
                      <span className="mt-0.5 block text-xs text-[var(--text-muted)]">
                        {item.grupoMuscular}
                      </span>
                    </span>
                  </span>
                  <span className="grid size-8 shrink-0 place-items-center rounded-full border border-[var(--border)] text-[var(--text-muted)] transition-colors group-hover:border-[var(--volt)] group-hover:bg-[var(--volt)] group-hover:text-black">
                    <Plus className="size-4" />
                  </span>
                </button>
              );
            })
          ) : (
            <p className="animate-fade-in p-5 text-center text-sm text-[var(--text-muted)]">
              No hay ejercicios que coincidan.
            </p>
          )}
        </div>
        <div className="mt-5 flex justify-end">
          <DialogClose asChild>
            <Button variant="ghost">Cerrar</Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
