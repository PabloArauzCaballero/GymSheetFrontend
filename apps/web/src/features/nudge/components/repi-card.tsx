'use client';

import { gymEntry, gymInput } from '@gymsheet/domain/nudge';
import { summariseTraining } from '@gymsheet/domain';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useSyncExternalStore } from 'react';
import { programKeys } from '@/features/routines-v2/keys';
import { programService } from '@/features/routines-v2/services';
import { trainingService } from '@/features/training/services/training-service';
import { workoutService } from '@/features/workouts/services/workout-service';
import { Repi } from '@/shared/components/media/repi';

const subscribeNever = () => () => {};

/**
 * Repi en la web: lo mismo que dice en el widget y en las tarjetas del móvil,
 * calculado con el mismo motor (`@gymsheet/domain/nudge`) y las mismas
 * consultas que Inicio (misma clave, misma caché: no añade peticiones).
 *
 * La web no tiene widgets ni avisos locales, así que aquí solo habla del
 * entreno. Antes de tener datos no ocupa sitio; en Rutinas (`here="routines"`)
 * no enlaza a la pantalla en la que ya estás.
 */
export function RepiCard({ here }: Readonly<{ here?: 'routines' }>) {
  // La hora es la de quien mira: en el servidor no se pinta nada.
  const mounted = useSyncExternalStore(subscribeNever, () => true, () => false);
  const workouts = useQuery({ queryKey: ['workouts', 'recent'], queryFn: () => workoutService.list(1, 40) });
  const programs = useQuery({ queryKey: programKeys.active, queryFn: programService.active, staleTime: 30_000 });
  const routineId = programs.data?.fuerza?.rutinaId;
  const routine = useQuery({
    queryKey: ['routine', routineId],
    queryFn: () => trainingService.get(routineId ?? ''),
    enabled: Boolean(routineId),
  });

  const ready = mounted && workouts.isSuccess && !programs.isPending && (!routineId || !routine.isPending);
  const entry = useMemo(() => {
    if (!ready) return null;
    const now = new Date();
    const sessions = workouts.data?.items ?? [];
    const input = gymInput(now, sessions, routine.data?.dias ?? null, summariseTraining(sessions, now).streakWeeks);
    return gymEntry(input, now);
  }, [ready, workouts.data, routine.data]);

  if (!entry) return null;
  const body = (
    <>
      <Repi className="size-16 shrink-0 sm:size-[4.5rem]" mood={entry.mood} size={72} />
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="t-headline">{entry.title}</span>
        <span className="t-subhead text-[var(--text-muted)]">{entry.body}</span>
      </span>
    </>
  );
  const shell = 'panel flex items-center gap-3 px-4 py-3';
  if (here === 'routines') {
    return (
      <section aria-label="Repi" className={shell} data-testid="repi-gym">
        {body}
      </section>
    );
  }
  return (
    <Link aria-label={`${entry.title}. ${entry.body}`} className={`${shell} tap hover-lift`} data-testid="repi-gym" href="/routines">
      {body}
      <ChevronRight aria-hidden className="size-4 shrink-0 text-[var(--text-muted)]" />
    </Link>
  );
}
