'use client';

import { muscleInfo } from '@gymsheet/anatomy';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Dumbbell } from 'lucide-react';
import { muscleKeys, muscleService } from '@/features/anatomy/services/muscle-service';
import { exerciseService } from '@/features/exercises/services/exercise-service';
import { EmptyState } from '@/shared/components/feedback/empty-state';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { SkeletonList } from '@/shared/components/feedback/skeleton';
import { DomainImage } from '@/shared/components/media/domain-image';
import { Button } from '@/shared/components/ui/button';
import { notify } from '@/shared/notifications';
import { PickToggle } from './pick-row';
import type { PickConfig } from './pick-types';

const PAGE_SIZE = 30;

/**
 * Ejercicios de un músculo dentro del selector del asistente. Es la versión en
 * línea de la página de músculo de la biblioteca: el asistente tiene que seguir
 * en su propia ruta (con su barra de progreso), así que no puede saltar a
 * `/exercises/muscle/[code]`.
 *
 * Esta lista no trae el grupo muscular de cada ejercicio, que el asistente
 * necesita para sus avisos: al añadir se pide la ficha completa.
 */
export function MusclePickList({
  code,
  pick,
  onBack,
}: Readonly<{ code: string; pick: PickConfig; onBack: () => void }>) {
  const queryClient = useQueryClient();
  const exercises = useInfiniteQuery({
    queryKey: muscleKeys.exercises(code),
    queryFn: ({ pageParam }) =>
      muscleService.exercises(code, { limit: PAGE_SIZE, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (last) =>
      last.offset + last.ejercicios.length < last.total ? last.offset + last.limit : undefined,
  });
  const items = exercises.data?.pages.flatMap((page) => page.ejercicios) ?? [];
  const name = muscleInfo(code)?.name ?? 'Músculo';

  const toggle = async (id: string) => {
    if (pick.isAdded(id)) {
      pick.remove(id);
      return;
    }
    try {
      pick.add(
        await queryClient.fetchQuery({
          queryKey: ['exercise', id],
          queryFn: () => exerciseService.get(id),
        }),
      );
    } catch (error) {
      notify.error(error);
    }
  };

  return (
    <section aria-label={`Ejercicios de ${name}`} className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button onClick={onBack} variant="ghost">
          <ArrowLeft className="size-4" />
          Todos los músculos
        </Button>
        <h2 className="text-xl font-semibold">{name}</h2>
      </div>
      {exercises.isPending ? (
        <SkeletonList rows={6} />
      ) : exercises.isError ? (
        <ErrorPanel message={exercises.error.message} onRetry={() => exercises.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          description="Todavía no hay ejercicios registrados para este músculo."
          title="Sin ejercicios"
        />
      ) : (
        <>
          <ul className="panel divide-y divide-[var(--border-subtle)] overflow-hidden">
            {items.map((exercise) => {
              const added = pick.isAdded(exercise.id);
              return (
                <li className="flex items-center gap-3 px-3 py-2" key={exercise.id}>
                  <button
                    aria-label={`${exercise.nombre}. Abrir ficha`}
                    className="flex min-h-14 min-w-0 flex-1 items-center gap-4 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--volt)]"
                    onClick={() => pick.onOpen(exercise.id)}
                    type="button"
                  >
                    <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-high)]">
                      {exercise.imagen ? (
                        <DomainImage
                          alt=""
                          className="size-full bg-white object-cover"
                          src={exercise.imagen.url}
                        />
                      ) : (
                        <Dumbbell aria-hidden className="size-5 text-[var(--text-disabled)]" />
                      )}
                    </span>
                    <span className="min-w-0 truncate font-semibold">{exercise.nombre}</span>
                  </button>
                  <PickToggle
                    added={added}
                    name={exercise.nombre}
                    onToggle={() => void toggle(exercise.id)}
                  />
                </li>
              );
            })}
          </ul>
          {exercises.hasNextPage ? (
            <Button
              loading={exercises.isFetchingNextPage}
              onClick={() => exercises.fetchNextPage()}
            >
              Ver más ejercicios
            </Button>
          ) : null}
        </>
      )}
    </section>
  );
}
