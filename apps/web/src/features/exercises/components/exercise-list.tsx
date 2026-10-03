'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import { useMemo, useState, type CSSProperties } from 'react';
import { notify } from '@/shared/notifications';
import { exerciseService } from '@/features/exercises/services/exercise-service';
import { queryKeys } from '@/shared/api/query-keys';
import { EmptyState } from '@/shared/components/feedback/empty-state';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import {
  SkeletonCardGrid,
} from '@/shared/components/feedback/skeleton';
import { PageHeader } from '@/shared/components/layout/page-header';
import { ButtonLink } from '@/shared/components/ui/button';
import { Field } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import { Pagination } from '@/shared/components/ui/pagination';
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value';
import { BodyMap } from '@/features/anatomy/components/body-map';
import { ExerciseCard } from './exercise-card';
import { ExerciseZoneFilter } from './exercise-zone-filter';

export function ExerciseList() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [bodyPart, setBodyPart] = useState<string | null>(null);
  const [muscle, setMuscle] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const filters = useMemo(
    () => ({
      page,
      pageSize: 24,
      search: debouncedSearch || undefined,
      bodyPart: bodyPart ?? undefined,
      targetMuscle: muscle ?? undefined,
    }),
    [bodyPart, debouncedSearch, muscle, page],
  );
  const filterKey = new URLSearchParams(
    Object.entries(filters)
      .filter((entry): entry is [string, string | number] => entry[1] !== undefined)
      .map(([key, value]) => [key, String(value)]),
  ).toString();
  const exercises = useQuery({
    queryKey: queryKeys.exercises(filterKey),
    queryFn: () => exerciseService.list(filters),
  });
  const taxonomy = useQuery({
    queryKey: ['exercises', 'taxonomy'],
    queryFn: exerciseService.taxonomy,
    staleTime: 10 * 60 * 1000,
  });
  const favorites = useQuery({
    queryKey: queryKeys.favorites,
    queryFn: exerciseService.listFavorites,
  });
  const favoriteIds = new Set(favorites.data?.map((item) => item.ejercicio.id) ?? []);
  const toggleFavorite = useMutation({
    mutationFn: async (id: string) =>
      favoriteIds.has(id) ? exerciseService.removeFavorite(id) : exerciseService.addFavorite(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.favorites });
      notify.success('Frecuentes actualizados.');
    },
    onError: (error: Error) => notify.error(error),
  });

  return (
    <div className="grid gap-8">
      <PageHeader
        actions={
          <span data-tutorial-id="exercises:new">
            <ButtonLink href="/exercises/new" variant="primary">
              <Plus className="size-4" />
              Ejercicio personal
            </ButtonLink>
          </span>
        }
        description="Catálogo global y ejercicios personales visibles para tu cuenta."
        eyebrow="Biblioteca técnica"
        title="Ejercicios"
        tutorialId="page:exercises"
      />
      {/* La figura va primero: elegir el músculo es el camino más corto a
          «qué entreno para esto». El buscador y la lista siguen debajo para
          quien ya sabe el nombre del ejercicio. */}
      <BodyMap />
      <section className="panel grid gap-4 p-4">
        <Field htmlFor="exercise-search" label="Buscar">
          <div className="relative" data-tutorial-id="exercises:search">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <Input
              className="pl-10"
              id="exercise-search"
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Nombre, músculo o parte corporal"
              // `search` y no `text`: es lo que hace que el campo se anuncie
              // como buscador —rol `searchbox`— en vez de como una caja de
              // texto cualquiera, y lo que da el botón de borrar del navegador
              // y el teclado con «Buscar» en el móvil. El aspecto no cambia.
              type="search"
              value={search}
            />
          </div>
        </Field>
        {taxonomy.data?.length ? (
          <div data-tutorial-id="exercises:filter">
            <ExerciseZoneFilter
              bodyPart={bodyPart}
              muscle={muscle}
              onBodyPart={(value) => {
                setBodyPart(value);
                setMuscle(null);
                setPage(1);
              }}
              onMuscle={(value) => {
                setMuscle(value);
                setPage(1);
              }}
              taxonomy={taxonomy.data}
            />
          </div>
        ) : null}
      </section>
      {exercises.isLoading ? (
        <SkeletonCardGrid count={6} withMedia />
      ) : exercises.isError ? (
        <ErrorPanel message={exercises.error.message} onRetry={() => exercises.refetch()} />
      ) : exercises.data?.items.length ? (
        <>
          <section className="stagger grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {exercises.data.items.map((exercise, position) => (
              <div key={exercise.id} style={{ '--i': position } as CSSProperties}>
                <ExerciseCard
                  busy={toggleFavorite.isPending}
                  exercise={exercise}
                  favorite={favoriteIds.has(exercise.id)}
                  onToggleFavorite={() => toggleFavorite.mutate(exercise.id)}
                />
              </div>
            ))}
          </section>
          <Pagination
            onPageChange={setPage}
            page={exercises.data.page}
            totalPages={exercises.data.totalPages}
          />
        </>
      ) : (
        <EmptyState
          action={
            <ButtonLink href="/exercises/new" variant="primary">
              Crear ejercicio
            </ButtonLink>
          }
          description="Ajusta los filtros o registra un ejercicio personal."
          title="No hay resultados"
        />
      )}
    </div>
  );
}
