'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Skeleton, SkeletonScreen } from '@/shared/components/feedback/skeleton';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import { muscleKeys, muscleService } from '../services/muscle-service';

const ROLES = [
  { key: 'primarios', title: 'Principales' },
  { key: 'secundarios', title: 'Secundarios' },
  { key: 'estabilizadores', title: 'Estabilizadores' },
] as const;

/**
 * «Músculos que trabaja», separados por cómo los trabaja. Cada chip abre la
 * página de ese músculo: es el camino de vuelta de la figura al ejercicio y
 * del ejercicio a la figura.
 *
 * Si el ejercicio no tiene músculos clasificados la tarjeta no se pinta: un
 * bloque vacío diciendo «sin datos» no ayuda a nadie a entrenar.
 */
export function ExerciseMuscles({ exerciseId }: Readonly<{ exerciseId: string }>) {
  const muscles = useQuery({
    queryKey: muscleKeys.forExercise(exerciseId),
    queryFn: () => muscleService.forExercise(exerciseId),
    staleTime: 10 * 60 * 1000,
  });

  if (muscles.isPending) {
    return (
      <Card>
        <CardHeader title="Músculos que trabaja" />
        <CardContent>
          <SkeletonScreen className="flex flex-wrap gap-2" label="Cargando músculos">
            <Skeleton className="h-8 w-28 rounded-full" />
            <Skeleton className="h-8 w-36 rounded-full" />
            <Skeleton className="h-8 w-24 rounded-full" />
          </SkeletonScreen>
        </CardContent>
      </Card>
    );
  }
  const data = muscles.data;
  if (!data || ROLES.every(({ key }) => data[key].length === 0)) return null;

  return (
    <Card>
      <CardHeader title="Músculos que trabaja" />
      <CardContent className="grid gap-4">
        {ROLES.map(({ key, title }) =>
          data[key].length ? (
            <div className="grid gap-2" key={key}>
              <p className="data-label text-[var(--text-muted)]">{title}</p>
              <ul className="flex flex-wrap gap-2">
                {data[key].map((muscle) => (
                  <li key={muscle.code}>
                    <Link
                      className={
                        'inline-flex h-8 items-center rounded-full border px-3 text-sm font-medium transition-colors duration-[var(--dur-1)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-ink)] ' +
                        (key === 'primarios'
                          ? 'border-[var(--accent-ink)]/40 text-[var(--text)] hover:bg-[var(--surface)]'
                          : 'border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-[var(--text)]')
                      }
                      href={`/exercises/muscle/${muscle.code}`}
                      title={muscle.nombreLatin}
                    >
                      {muscle.nombre}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null,
        )}
      </CardContent>
    </Card>
  );
}
