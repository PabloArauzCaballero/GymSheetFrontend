'use client';

import {
  WEEKDAY_NAMES,
  estimateDayMinutes,
  nextSession,
  weekLabel,
  type Weekday,
} from '@gymsheet/hooks';
import { selectExercisePoster } from '@gymsheet/domain';
import type { Program, Routine, RoutineAssignment, RoutineDay, Workout } from '@gymsheet/types';
import { useMutation } from '@tanstack/react-query';
import { ArrowRight, CircleCheck, Play, TrendingUp, CalendarDays } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { trainingService } from '@/features/training/services/training-service';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { Skeleton } from '@/shared/components/feedback/skeleton';
import { DomainImage } from '@/shared/components/media/domain-image';
import { HeroSurface } from '@/shared/components/mobile/hero-surface';
import { Button, ButtonLink } from '@/shared/components/ui/button';
import { notify } from '@/shared/notifications';

/**
 * «Hoy» (`features/home/today-card.tsx` del móvil): lo primero de Inicio y su
 * única acción en acento. Por orden: sesión abierta → día del programa →
 * rutina asignada por el entrenador → elegir una rutina.
 */

function Kicker({ children }: Readonly<{ children: string }>) {
  return <p className="t-footnote tabular-nums text-[var(--text-muted)]">{children}</p>;
}

function Surface({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <HeroSurface watermark>
      <div className="grid gap-3" data-testid="today-card">
        {children}
      </div>
    </HeroSurface>
  );
}

function dayTitle(day: Pick<RoutineDay, 'nombre' | 'diaSemana'>): string {
  return day.nombre?.trim() || (day.diaSemana ? WEEKDAY_NAMES[day.diaSemana as Weekday] : 'Entreno');
}

function dayMeta(day: RoutineDay): string {
  const count = day.ejercicios.length;
  const minutes = estimateDayMinutes(
    day.ejercicios.map((item) => ({
      grupo: item.grupo ?? null,
      grupoTipo: item.grupoTipo ?? null,
      series: item.seriesObjetivo,
      descansoSeg: item.descansoSeg,
      descansoEntreSeg: item.descansoEntreSeg ?? null,
      duracionSeg: item.duracionSeg ?? null,
    })),
  );
  return [`${count} ${count === 1 ? 'ejercicio' : 'ejercicios'}`, minutes ? `≈${minutes} min` : null]
    .filter(Boolean)
    .join(' · ');
}

/** Tres miniaturas en fila: lo que se va a hacer hoy, antes de leerlo. */
function DayThumbs({ day }: Readonly<{ day: RoutineDay }>) {
  const thumbs = day.ejercicios
    .map((item) => item.ejercicio)
    .filter((exercise): exercise is NonNullable<typeof exercise> => Boolean(exercise))
    .slice(0, 3);
  if (thumbs.length === 0) return null;
  return (
    <div aria-hidden className="flex gap-2">
      {thumbs.map((exercise) => {
        const poster = selectExercisePoster(exercise.media, null);
        const src = exercise.imagenUrl ?? poster?.url ?? '';
        return (
          <span
            className="block size-16 overflow-hidden rounded-[var(--radius-md)] bg-[var(--surface-highest)]"
            key={exercise.id}
          >
            {src ? <DomainImage alt="" className="size-full object-cover" src={src} /> : null}
          </span>
        );
      })}
    </div>
  );
}

function useStartRoutine(routineId: string) {
  const router = useRouter();
  return useMutation({
    mutationFn: (routineDayId?: string) => trainingService.start(routineId, routineDayId),
    onSuccess: (session) => router.push(`/workouts/${session.id}`),
    onError: (error: Error) => notify.error(error),
  });
}

function ProgramToday({ program, routine }: Readonly<{ program: Program; routine: Routine }>) {
  const start = useStartRoutine(routine.id);
  const now = new Date();
  const today = (((now.getDay() + 6) % 7) + 1) as Weekday;
  const next = nextSession(routine, today);
  const day = next ? routine.dias.find((item) => item.id === next.routineDayId) : undefined;
  const week = weekLabel(program);
  const routineHref = `/routines/${routine.id}`;

  if (!next || !day) {
    return (
      <Surface>
        <Kicker>{week}</Kicker>
        <h2 className="title-text">{routine.nombre}</h2>
        <p className="t-subhead text-[var(--text-muted)]">Tu rutina no tiene días con ejercicios todavía.</p>
        <ButtonLink href={routineHref} variant="secondary">
          Abrir la rutina <ArrowRight aria-hidden className="size-4" />
        </ButtonLink>
      </Surface>
    );
  }

  if (next.esHoy) {
    return (
      <Surface>
        <Kicker>{`Hoy · ${week}${program.esDescarga ? ' · Descarga' : ''}`}</Kicker>
        <h2 className="display-title line-clamp-2">{dayTitle(day)}</h2>
        <p className="t-subhead tabular-nums text-[var(--text-muted)]">{`${routine.nombre} · ${dayMeta(day)}`}</p>
        <DayThumbs day={day} />
        <div className="grid gap-2 sm:flex sm:items-center">
          <Button
            loading={start.isPending}
            onClick={() => start.mutate(day.id)}
            size="lg"
            variant="primary"
          >
            <Play aria-hidden className="size-4" />
            Entrenar hoy
          </Button>
          <ButtonLink href={routineHref} size="sm" variant="ghost">
            Ver el día <ArrowRight aria-hidden className="size-4" />
          </ButtonLink>
        </div>
      </Surface>
    );
  }

  return (
    <Surface>
      <Kicker>{`Hoy descansas · ${week}`}</Kicker>
      <h2 className="title-text line-clamp-2">{`${WEEKDAY_NAMES[next.dia as Weekday]}: ${dayTitle(day)}`}</h2>
      <p className="t-subhead tabular-nums text-[var(--text-muted)]">{dayMeta(day)}</p>
      <DayThumbs day={day} />
      <ButtonLink className="sm:justify-self-start" href={routineHref} variant="secondary">
        Ver el próximo día <ArrowRight aria-hidden className="size-4" />
      </ButtonLink>
    </Surface>
  );
}

const PLAN_PROMISES = [
  { icon: CalendarDays, text: 'Abre la app y mira qué toca hoy, con series y carga.' },
  { icon: CircleCheck, text: 'Marca tu semana día a día y sostén la racha.' },
  { icon: TrendingUp, text: 'Comprueba cómo sube tu carga semana a semana.' },
] as const;

export function TodayCard({
  openSession,
  program,
  routine,
  assignment,
  loading,
  error,
  onRetry,
}: Readonly<{
  openSession: Workout | undefined;
  program: Program | null | undefined;
  routine: Routine | undefined;
  assignment: RoutineAssignment | undefined;
  loading: boolean;
  error: Error | null;
  onRetry: () => void;
}>) {
  if (openSession) {
    const count = openSession.ejercicios.length;
    return (
      <Surface>
        <Kicker>En curso</Kicker>
        <h2 className="title-text">Tienes una sesión abierta</h2>
        <p className="t-subhead text-[var(--text-muted)]">
          {`${count} ${count === 1 ? 'ejercicio' : 'ejercicios'} · sigue donde lo dejaste.`}
        </p>
        <ButtonLink className="sm:justify-self-start" href={`/workouts/${openSession.id}`} size="lg" variant="primary">
          <Play aria-hidden className="size-4" />
          Continuar entrenamiento
        </ButtonLink>
      </Surface>
    );
  }

  if (loading) {
    return <Skeleton className="h-62 rounded-[var(--radius-2xl)]" />;
  }
  if (error) return <ErrorPanel message={error.message} onRetry={onRetry} />;

  if (program && routine) return <ProgramToday program={program} routine={routine} />;

  if (assignment?.rutina) {
    const rutina = assignment.rutina;
    return (
      <Surface>
        <Kicker>De tu entrenador</Kicker>
        <h2 className="title-text line-clamp-2">{rutina.nombre}</h2>
        {assignment.nota ? <p className="t-subhead text-[var(--text-muted)]">{assignment.nota}</p> : null}
        <ButtonLink className="sm:justify-self-start" href={`/routines/${rutina.id}`} size="lg" variant="primary">
          Ver la rutina <ArrowRight aria-hidden className="size-4" />
        </ButtonLink>
      </Surface>
    );
  }

  return (
    <Surface>
      <Kicker>Empieza aquí</Kicker>
      <h2 className="display-title">Entrena con un plan, no a ojo</h2>
      <ul className="m-0 grid list-none gap-3 p-0">
        {PLAN_PROMISES.map(({ icon: Icon, text }) => (
          <li className="flex items-center gap-3" key={text}>
            <Icon aria-hidden className="size-5 shrink-0 text-[var(--text-muted)]" />
            <span className="t-subhead text-[var(--text-muted)]">{text}</span>
          </li>
        ))}
      </ul>
      <p className="t-footnote text-[var(--text-muted)]">Te recomendamos una según tu objetivo y tus días.</p>
      <ButtonLink className="sm:justify-self-start" href="/routines" size="lg" variant="primary">
        Ver rutinas para ti <ArrowRight aria-hidden className="size-4" />
      </ButtonLink>
    </Surface>
  );
}
