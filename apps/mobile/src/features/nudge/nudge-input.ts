/**
 * De los datos que ya trae la app (entrenos, rutina activa, matches) a la
 * entrada del motor. Puro, para probarlo sin red.
 */
import type { GymNudgeInput, MatchNudgeInput } from './nudge.ts';

type WorkoutLike = Readonly<{ estado: string; fechaInicio: string; fechaFin: string | null }>;
type DayLike = Readonly<{ diaSemana: number | null; nombre: string | null }>;
type PendingLike = Readonly<{
  count: number;
  oldest: { userId: string; firstName: string; conversationId: string | null; waitingSince: string } | null;
}>;

const WEEKDAYS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

/** El último entreno terminado: su fin, o su inicio si no se cerró con hora. */
export function lastFinishedAt(workouts: readonly WorkoutLike[]): Date | null {
  let latest: number | null = null;
  for (const workout of workouts) {
    if (workout.estado !== 'FINALIZADA') continue;
    const at = Date.parse(workout.fechaFin ?? workout.fechaInicio);
    if (Number.isFinite(at) && (latest === null || at > latest)) latest = at;
  }
  return latest === null ? null : new Date(latest);
}

export function gymInput(
  now: Date,
  workouts: readonly WorkoutLike[],
  days: readonly DayLike[] | null,
  streakWeeks: number,
): GymNudgeInput {
  const scheduledWeekdays: number[] = [];
  const dayNames: Partial<Record<number, string>> = {};
  for (const day of days ?? []) {
    if (day.diaSemana === null) continue;
    scheduledWeekdays.push(day.diaSemana);
    const name = day.nombre?.trim();
    // «Hoy toca Jueves» no dice nada: solo los días con nombre propio.
    if (name && name.toLowerCase() !== WEEKDAYS[day.diaSemana - 1]) dayNames[day.diaSemana] = name;
  }
  return { now, lastWorkoutAt: lastFinishedAt(workouts), scheduledWeekdays, dayNames, streakWeeks };
}

export function matchInput(now: Date, pending: PendingLike | null, showNames: boolean): MatchNudgeInput {
  const oldest = pending?.oldest;
  return {
    now,
    pending: pending?.count ?? 0,
    oldest: oldest
      ? { userId: oldest.userId, name: oldest.firstName, conversationId: oldest.conversationId, since: new Date(oldest.waitingSince) }
      : null,
    showNames,
  };
}
