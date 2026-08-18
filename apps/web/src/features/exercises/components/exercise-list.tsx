'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, SlidersHorizontal } from 'lucide-react';
import { useMemo, useState, type CSSProperties } from 'react';
import { notify } from '@/shared/notifications';
import { exerciseService } from '@/features/exercises/services/exercise-service';
import { queryKeys } from '@/shared/api/query-keys';
import { EmptyState } from '@/shared/components/feedback/empty-state';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { LoadingPanel } from '@/shared/components/feedback/loading-panel';
import { PageHeader } from '@/shared/components/layout/page-header';
import { ButtonLink } from '@/shared/components/ui/button';
import { Field } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import { Pagination } from '@/shared/components/ui/pagination';
import { Select } from '@/shared/components/ui/select';
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value';
import { ExerciseCard } from './exercise-card';

export function ExerciseList() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const filters = useMemo(
    () => ({
      page,
      pageSize: 24,
      search: debouncedSearch || undefined,
      grupoMuscular: group || undefined,
    }),
    [debouncedSearch, group, page],
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

  const groups = [...new Set(exercises.data?.items.map((item) => item.grupoMuscular) ?? [])].sort();
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
      <section className="panel grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_240px]">
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
              value={search}
            />
          </div>
        </Field>
        <Field htmlFor="muscle-group" label="Grupo muscular">
          <div className="relative" data-tutorial-id="exercises:filter">
            <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <Select
              className="pl-10"
              id="muscle-group"
              onChange={(event) => {
                setGroup(event.target.value);
                setPage(1);
              }}
              value={group}
            >
              <option value="">Todos</option>
              {groups.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
          </div>
        </Field>
      </section>
      {exercises.isLoading ? (
        <LoadingPanel rows={8} />
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
