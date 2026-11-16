import { exerciseGroupLabelEs } from '@gymsheet/domain';
import type { ModerationExerciseContent, ModerationRoutineContent } from '@gymsheet/schemas';
import { Dumbbell, Users } from 'lucide-react';

const WEEKDAY = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

function plural(count: number, one: string, many: string) {
  return count === 1 ? `1 ${one}` : `${count} ${many}`;
}

function setsText(exercise: ModerationRoutineContent['days'][number]['exercises'][number]) {
  const { repsMin: min, repsMax: max } = exercise;
  const reps =
    min === null && max === null
      ? null
      : min === max || max === null || min === null
        ? `${max ?? min} reps`
        : `${min}–${max} reps`;
  return [
    exercise.name,
    plural(exercise.sets, 'serie', 'series'),
    reps,
    exercise.weightKg === null ? null : `${exercise.weightKg} kg`,
    exercise.durationSeconds === null ? null : `${exercise.durationSeconds} s`,
  ]
    .filter(Boolean)
    .join(' · ');
}

/** The reported routine as the case file sends it, hidden or private included. */
export function RoutineBody({ routine }: Readonly<{ routine: ModerationRoutineContent }>) {
  const exerciseCount = routine.days.reduce((sum, day) => sum + day.exercises.length, 0);
  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-base font-semibold">{routine.name}</p>
        {routine.description ? (
          <p className="mt-1 text-sm text-[var(--text-muted)]">{routine.description}</p>
        ) : null}
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          {plural(routine.days.length, 'día', 'días')} ·{' '}
          {plural(exerciseCount, 'ejercicio', 'ejercicios')}
        </p>
      </div>

      <p
        className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-[4px] border border-[var(--border-subtle)] p-3 text-sm"
        data-testid="alcance"
      >
        <Users aria-hidden className="size-4 text-[var(--text-muted)]" />
        <span>
          <strong>Alcance</strong>
        </span>
        <span>{routine.reach.liveCopies} con una copia activa</span>
        <span>{routine.reach.copies} copias en total</span>
        <span>{routine.reach.activations} activaciones</span>
      </p>

      <ul className="flex flex-col gap-2">
        {routine.days.map((day, index) => (
          <li
            className="rounded-[4px] border border-[var(--border-subtle)] p-3"
            key={`${day.name ?? 'dia'}-${index}`}
          >
            <p className="text-sm font-medium">
              {day.name ?? `Día ${index + 1}`}
              {day.weekday ? (
                <span className="font-normal text-[var(--text-muted)]">
                  {' '}
                  · {WEEKDAY[day.weekday - 1]}
                </span>
              ) : null}
            </p>
            <ul className="mt-1 text-sm text-[var(--text-muted)]">
              {day.exercises.map((exercise, position) => (
                <li key={`${exercise.name}-${position}`}>{setsText(exercise)}</li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ExerciseBody({ exercise }: Readonly<{ exercise: ModerationExerciseContent }>) {
  const groups = exercise.muscleGroups.map((group) => exerciseGroupLabelEs(group) || group);
  return (
    <div className="flex flex-col gap-2">
      <p className="flex items-center gap-2 text-base font-semibold">
        <Dumbbell aria-hidden className="size-4 text-[var(--text-muted)]" />
        {exercise.name}
      </p>
      <p className="text-xs text-[var(--text-muted)]">
        {groups.length > 0 ? groups.join(', ') : 'Sin grupo muscular'} ·{' '}
        {plural(exercise.media.length, 'archivo', 'archivos')} de medios
      </p>
      {exercise.description ? <p className="text-sm">{exercise.description}</p> : null}
      {exercise.instructions.length > 0 ? (
        <ol className="list-decimal pl-5 text-sm text-[var(--text-muted)]">
          {exercise.instructions.map((step, position) => (
            <li key={`${position}-${step}`}>{step}</li>
          ))}
        </ol>
      ) : null}
      {exercise.media.length > 0 ? (
        <ul className="flex flex-col gap-1 text-sm">
          {exercise.media.map((media, position) => (
            <li key={`${position}-${media.url}`}>
              <a
                className="underline underline-offset-2"
                href={media.url}
                rel="noreferrer noopener"
                target="_blank"
              >
                {media.type === 'VIDEO' ? 'Ver video' : 'Ver imagen'} {position + 1}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
