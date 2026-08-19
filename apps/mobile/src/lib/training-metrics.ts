import type { Workout, WorkoutExercise } from '@gymsheet/types';

/**
 * What a training log actually says, derived on the client.
 *
 * Every number here comes from sessions the app already downloads to render the
 * history list, so the dashboard costs one extra query at most and no backend
 * work. That matters beyond performance: a metric computed from the same
 * payload the user can see listed underneath can always be reconciled by hand,
 * which is not true of a figure the server hands over pre-chewed.
 *
 * Only finished sessions count. A session left open — the app has an explicit
 * «tienes una sesión abierta» state — is an intention, and counting intentions
 * as training is how a progress screen starts flattering its user.
 */

/** Monday-based week start, at local midnight. Weeks run Mon–Sun here. */
export function startOfWeek(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  // getDay() is 0 for Sunday; shift so Monday is the origin.
  const weekday = (copy.getDay() + 6) % 7;
  copy.setDate(copy.getDate() - weekday);
  return copy;
}

/** Load moved in one set, in kilograms. */
function setVolume(weightKg: number, reps: number): number {
  return weightKg * reps;
}

/**
 * Tonnage of a session: Σ peso × repeticiones.
 *
 * The crude measure, and deliberately so. Anything finer — estimated 1RM,
 * relative intensity — needs assumptions about the lifter that this app has no
 * business inventing, while tonnage is arithmetic on what was actually written
 * down. Bodyweight sets contribute zero, which understates them; that is a
 * known floor, not a bug, and it is the same floor every week so the *trend*
 * stays honest even where the absolute number is low.
 */
export function workoutVolume(workout: Workout): number {
  return workout.ejercicios.reduce(
    (total, exercise) =>
      total +
      exercise.series.reduce(
        (sum, item) => sum + setVolume(item.pesoKg, item.repeticiones),
        0,
      ),
    0,
  );
}

export interface WeekSummary {
  /** Local midnight on the Monday this week starts. */
  readonly start: Date;
  readonly sessions: number;
  readonly volumeKg: number;
  readonly sets: number;
  /** Muscle group → sets worked, biggest first. */
  readonly muscles: readonly { readonly name: string; readonly sets: number }[];
}

/** The label a set should be filed under. */
function muscleOf(exercise: WorkoutExercise): string | null {
  const source = exercise.ejercicio;
  if (!source) return null;
  // `grupoMuscular` is the field the catalogue guarantees; `targetMuscle` comes
  // from the imported dataset and is finer but nullable. Group first: a weekly
  // summary wants «Pecho», not «Pectoralis major, sternal head».
  return source.grupoMuscular || source.targetMuscle || null;
}

function summarise(start: Date, workouts: readonly Workout[]): WeekSummary {
  const muscles = new Map<string, number>();
  let sets = 0;
  let volumeKg = 0;
  for (const workout of workouts) {
    for (const exercise of workout.ejercicios) {
      sets += exercise.series.length;
      volumeKg += exercise.series.reduce(
        (sum, item) => sum + setVolume(item.pesoKg, item.repeticiones),
        0,
      );
      const muscle = muscleOf(exercise);
      if (muscle && exercise.series.length > 0) {
        muscles.set(muscle, (muscles.get(muscle) ?? 0) + exercise.series.length);
      }
    }
  }
  return {
    start,
    sessions: workouts.length,
    volumeKg,
    sets,
    muscles: [...muscles.entries()]
      .map(([name, count]) => ({ name, sets: count }))
      .sort((a, b) => b.sets - a.sets),
  };
}

export interface TrainingSummary {
  readonly thisWeek: WeekSummary;
  readonly lastWeek: WeekSummary;
  /**
   * Consecutive weeks with at least one finished session, counting back from
   * this week. The current week only breaks a streak once it is over, so a
   * streak does not collapse on Monday morning for someone who trains Fridays.
   */
  readonly streakWeeks: number;
  /** Finished sessions in the last 28 days, the window the app charts. */
  readonly recentSessions: number;
}

/**
 * Progressive overload, expressed the only way a weekly view can: is more work
 * being done than in the comparable previous week.
 *
 * `null` when there is nothing to compare against — a first week, or a return
 * after a lay-off. That case must not render as «0 %»: zero change and no
 * baseline are different facts, and conflating them tells a beginner they are
 * stagnating on their very first session.
 */
export function overloadDelta(
  summary: TrainingSummary,
): { label: string; direction: 'up' | 'down' | 'flat' } | null {
  const previous = summary.lastWeek.volumeKg;
  if (previous <= 0) return null;
  const change = ((summary.thisWeek.volumeKg - previous) / previous) * 100;
  const rounded = Math.round(change);
  if (rounded === 0) return { label: 'igual', direction: 'flat' };
  return {
    label: `${rounded > 0 ? '+' : '−'}${Math.abs(rounded)} %`,
    direction: rounded > 0 ? 'up' : 'down',
  };
}

/** `12 400 kg` → `12,4 t` once tonnage stops fitting in a tile. */
export function formatVolume(kg: number): string {
  if (kg <= 0) return '0 kg';
  if (kg < 1000) return `${Math.round(kg)} kg`;
  return `${(kg / 1000).toFixed(1).replace('.', ',')} t`;
}

export function summariseTraining(workouts: readonly Workout[], now = new Date()): TrainingSummary {
  const finished = workouts.filter((workout) => workout.estado === 'FINALIZADA');
  const thisStart = startOfWeek(now);
  const lastStart = new Date(thisStart);
  lastStart.setDate(lastStart.getDate() - 7);

  const inWeek = (start: Date) => {
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return finished.filter((workout) => {
      const date = new Date(workout.fechaInicio);
      return date >= start && date < end;
    });
  };

  // Walk back week by week. Bounded at 52 so a corrupt date cannot spin here.
  let streakWeeks = 0;
  for (let offset = 0; offset < 52; offset += 1) {
    const start = new Date(thisStart);
    start.setDate(start.getDate() - offset * 7);
    if (inWeek(start).length > 0) {
      streakWeeks += 1;
      continue;
    }
    // The week in progress is not yet a failure to train, so it does not break
    // the streak — it simply does not extend it.
    if (offset === 0) continue;
    break;
  }

  const monthAgo = new Date(now);
  monthAgo.setDate(monthAgo.getDate() - 28);

  return {
    thisWeek: summarise(thisStart, inWeek(thisStart)),
    lastWeek: summarise(lastStart, inWeek(lastStart)),
    streakWeeks,
    recentSessions: finished.filter((workout) => new Date(workout.fechaInicio) >= monthAgo).length,
  };
}

/**
 * The last time this exercise was trained *before* the session being logged.
 *
 * This is what makes «+2,5 kg» mean progressive overload rather than «heavier
 * than the set I did ninety seconds ago». Only finished sessions qualify, and
 * the session in progress is excluded by id: comparing today against itself
 * would show a lifter beating their own opening set and call it progress.
 */
export function previousPerformance(
  workouts: readonly Workout[],
  exerciseId: string,
  excludeWorkoutId: string,
): { readonly workout: Workout; readonly exercise: WorkoutExercise } | null {
  const candidates = workouts
    .filter((workout) => workout.id !== excludeWorkoutId && workout.estado === 'FINALIZADA')
    .sort((a, b) => new Date(b.fechaInicio).getTime() - new Date(a.fechaInicio).getTime());
  for (const workout of candidates) {
    const exercise = workout.ejercicios.find(
      (item) => item.ejercicio?.id === exerciseId && item.series.length > 0,
    );
    if (exercise) return { workout, exercise };
  }
  return null;
}

/** Heaviest set of a performance, which is what people compare week to week. */
export function topSet(
  exercise: WorkoutExercise,
): { readonly pesoKg: number; readonly repeticiones: number } | null {
  let best: { pesoKg: number; repeticiones: number } | null = null;
  for (const item of exercise.series) {
    if (!best || item.pesoKg > best.pesoKg) {
      best = { pesoKg: item.pesoKg, repeticiones: item.repeticiones };
    }
  }
  return best;
}
