'use client';

import { muscleInfo } from '@gymsheet/anatomy';
import type { MuscleExercise } from '@gymsheet/schemas';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { ArrowLeft, ChevronRight, Dumbbell, Flame, GitMerge, Info, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import type { ComponentType } from 'react';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { EmptyState } from '@/shared/components/feedback/empty-state';
import { SkeletonList } from '@/shared/components/feedback/skeleton';
import { DomainImage } from '@/shared/components/media/domain-image';
import { Button } from '@/shared/components/ui/button';
import { muscleKeys, muscleService } from '../services/muscle-service';
import { AnatomyCredit } from './anatomy-credit';
import { MuscleHero } from './muscle-hero';

const PAGE_SIZE = 30;

/** Cómo trabaja el músculo en el ejercicio, en el orden en que se enseña. */
const ROLES: readonly {
  role: MuscleExercise['rol'];
  title: string;
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
}[] = [
  { role: 'PRIMARY', title: 'Lo trabajan de lleno', icon: Flame },
  { role: 'SECONDARY', title: 'Lo trabajan de apoyo', icon: GitMerge },
  { role: 'STABILIZER', title: 'Lo estabilizan', icon: ShieldCheck },
];

/** `bear crawl` → `Bear crawl`: el dataset guarda los nombres en minúscula. */
function sentenceCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function ExerciseRow({ exercise }: Readonly<{ exercise: MuscleExercise }>) {
  return (
    <li>
      <Link
        className="group flex items-center gap-4 px-4 py-3 transition-colors duration-[var(--dur-1)] hover:bg-[var(--surface)] focus-visible:bg-[var(--surface)] focus-visible:outline-none"
        href={`/exercises/${exercise.id}`}
      >
        <span className="relative grid size-14 shrink-0 place-items-center overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-high)]">
          {exercise.imagen ? (
            <DomainImage
              alt={exercise.imagen.textoAlternativo ?? exercise.nombre}
              className="size-full bg-white object-cover"
              src={exercise.imagen.url}
            />
          ) : (
            <Dumbbell aria-hidden className="size-5 text-[var(--text-disabled)]" />
          )}
        </span>
        <span className="min-w-0 flex-1 truncate font-semibold">{sentenceCase(exercise.nombre)}</span>
        <ChevronRight
          aria-hidden
          className="size-4 shrink-0 text-[var(--text-disabled)] transition-transform duration-[var(--dur-1)] group-hover:translate-x-0.5"
        />
      </Link>
    </li>
  );
}

/**
 * Página de un músculo: adonde lleva elegirlo en la figura.
 *
 * En escritorio, la lámina recortada a la izquierda y fija; a la derecha qué es
 * y los ejercicios que lo trabajan, separados por cómo lo trabajan. La lista se
 * pide por páginas: un músculo grande tiene cientos de ejercicios.
 */
export function MusclePage({ code: rawCode }: Readonly<{ code: string }>) {
  const code = rawCode.toUpperCase();
  const local = muscleInfo(code);

  const muscle = useQuery({
    queryKey: muscleKeys.detail(code),
    queryFn: () => muscleService.get(code),
    staleTime: 30 * 60 * 1000,
  });
  const exercises = useInfiniteQuery({
    queryKey: muscleKeys.exercises(code),
    queryFn: ({ pageParam }) => muscleService.exercises(code, { limit: PAGE_SIZE, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (last) =>
      last.offset + last.ejercicios.length < last.total ? last.offset + last.limit : undefined,
  });

  // El nombre sale del catálogo local al instante; la API lo confirma y trae
  // la descripción. Así el título no parpadea mientras carga.
  const title = muscle.data?.nombre ?? local?.name ?? 'Músculo';
  const subtitle = muscle.data
    ? `${muscle.data.grupo.nombre} · ${muscle.data.nombreLatin}`
    : local
      ? `${local.group.name} · ${local.latinName}`
      : null;
  const items = exercises.data?.pages.flatMap((page) => page.ejercicios) ?? [];
  const first = exercises.data?.pages[0];
  const related = first?.aproximado ?? null;

  return (
    <div className="grid gap-8">
      <Link
        className="inline-flex w-fit items-center gap-2 text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
        href="/exercises"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Ejercicios
      </Link>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start">
        <div className="grid gap-3 lg:sticky lg:top-6">
          <MuscleHero code={code} />
          <AnatomyCredit />
        </div>

        <div className="grid min-w-0 gap-8">
          <header className="reveal grid gap-3">
            <h1 className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">{title}</h1>
            {subtitle ? <p className="text-[var(--text-muted)]">{subtitle}</p> : null}
            {muscle.data?.descripcion ? (
              <p className="max-w-2xl text-base leading-7 text-[var(--text-muted)]">
                {muscle.data.descripcion}
              </p>
            ) : null}
            {first ? (
              <p className="data-label text-[var(--text-disabled)]">
                {first.total} {first.total === 1 ? 'ejercicio' : 'ejercicios'}
                {related ? ` de ${related.nombre.toLowerCase()}` : ''}
              </p>
            ) : null}
          </header>

          {muscle.isError ? (
            <ErrorPanel message={muscle.error.message} onRetry={() => muscle.refetch()} />
          ) : exercises.isPending ? (
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
              {related ? (
                // No son ejercicios de este músculo: el dataset no los separa por
                // fascículo. Decirlo evita prometer «ejercicios de deltoides
                // lateral» y enseñar los de todo el deltoides sin avisar.
                <p className="flex items-start gap-3 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-low)] p-4 text-sm leading-6">
                  <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-[var(--text-muted)]" />
                  <span>
                    Ningún ejercicio trabaja solo este músculo. Estos entrenan{' '}
                    <strong className="font-semibold">{related.nombre.toLowerCase()}</strong>, un músculo
                    relacionado.
                  </span>
                </p>
              ) : null}
              {ROLES.map(({ role, title: roleTitle, icon: Icon }) => {
                const rows = items.filter((item) => item.rol === role);
                if (rows.length === 0) return null;
                return (
                  <section aria-labelledby={`role-${role}`} className="grid gap-3" key={role}>
                    <h2
                      className="data-label inline-flex items-center gap-2 text-[var(--text-muted)]"
                      id={`role-${role}`}
                    >
                      <Icon aria-hidden className="size-4" />
                      {roleTitle}
                      <span className="text-[var(--text-disabled)]">· {rows.length}</span>
                    </h2>
                    <ul className="panel divide-y divide-[var(--border-subtle)] overflow-hidden">
                      {rows.map((exercise) => (
                        <ExerciseRow exercise={exercise} key={exercise.id} />
                      ))}
                    </ul>
                  </section>
                );
              })}
              {exercises.hasNextPage ? (
                <Button
                  className="justify-self-start"
                  loading={exercises.isFetchingNextPage}
                  onClick={() => void exercises.fetchNextPage()}
                  variant="secondary"
                >
                  Ver más ejercicios
                </Button>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
