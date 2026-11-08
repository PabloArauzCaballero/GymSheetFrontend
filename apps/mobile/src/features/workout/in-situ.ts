import type { CreateRoutineWithDaysInput, RoutineDayExerciseInput, Workout, WorkoutExercise } from '@gymsheet/types';

/** Topes del backend para una rutina nueva (`routine-v2.schemas`). */
const MAX_SETS = 10;
const MAX_REPS = 50;
const MAX_EXERCISES_PER_DAY = 60;
const MAX_REST_SEC = 7200;
const MAX_RIR = 10;
const MAX_TIMED_SEC = 3600;
const DEFAULT_DURATION_WEEKS = 4;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle]! : Math.round((sorted[middle - 1]! + sorted[middle]!) / 2);
}

/** ¿Este ejercicio de la sesión entra en la rutina? Con series de fuerza hechas y sin omitir. */
export function isRoutineWorthy(item: WorkoutExercise): boolean {
  return !item.omitido && item.ejercicio !== null && item.series.some((set) => set.tipoSerie !== 'CARDIO');
}

/**
 * Lo hecho hoy, convertido en lo que pedirá la rutina: las series que hiciste,
 * el rango de repeticiones que recorriste y la carga más alta. Es una
 * plantilla, no un historial: la progresión la propone luego la rutina.
 */
export function exerciseToRoutine(item: WorkoutExercise): RoutineDayExerciseInput | null {
  if (!item.ejercicio) return null;
  const sets = item.series.filter((set) => set.tipoSerie !== 'CARDIO');
  if (sets.length === 0) return null;

  const timed = sets.every((set) => set.repeticiones === null && set.duracionSeg !== null);
  const reps = sets.map((set) => set.repeticiones).filter((value): value is number => value !== null && value > 0);
  const weights = sets.map((set) => set.pesoKg).filter((value): value is number => value !== null);
  const rests = sets.slice(1).map((set) => set.descansoSegAnterior).filter((value) => value > 0);
  const last = sets[sets.length - 1]!;

  return {
    ejercicioId: item.ejercicio.id,
    seriesObjetivo: clamp(sets.length, 1, MAX_SETS),
    repsMin: timed || reps.length === 0 ? null : clamp(Math.min(...reps), 1, MAX_REPS),
    repsMax: timed || reps.length === 0 ? null : clamp(Math.max(...reps), 1, MAX_REPS),
    pesoObjetivoKg: weights.length > 0 && Math.max(...weights) > 0 ? Math.max(...weights) : null,
    rirObjetivo: last.rir === null ? null : clamp(last.rir, 0, MAX_RIR),
    descansoSeg: (() => {
      const rest = median(rests);
      return rest === null ? null : clamp(rest, 0, MAX_REST_SEC);
    })(),
    nota: null,
    duracionSeg: timed ? clamp(Math.max(...sets.map((set) => set.duracionSeg ?? 0)), 1, MAX_TIMED_SEC) : null,
  };
}

/** Cuántos ejercicios de la sesión pasarían a la rutina. */
export function routineExerciseCount(session: Pick<Workout, 'ejercicios'>): number {
  return session.ejercicios.filter(isRoutineWorthy).length;
}

/**
 * El cuerpo de `POST /routines` para guardar la sesión como rutina propia:
 * un solo día, privada, con los ejercicios en el orden en que se entrenaron.
 */
export function routineFromSession(session: Pick<Workout, 'ejercicios'>, name: string): CreateRoutineWithDaysInput | null {
  const exercises = [...session.ejercicios]
    .sort((a, b) => a.orden - b.orden)
    .filter(isRoutineWorthy)
    .map(exerciseToRoutine)
    .filter((item): item is RoutineDayExerciseInput => item !== null)
    .slice(0, MAX_EXERCISES_PER_DAY);
  if (exercises.length === 0) return null;
  const title = name.trim();
  return {
    nombre: title,
    descripcion: 'Armada sobre la marcha, entrenando.',
    objetivo: null,
    visibilidad: 'PRIVATE',
    duracionSemanas: DEFAULT_DURATION_WEEKS,
    progresion: { activa: false, descargaCada: null } as unknown as CreateRoutineWithDaysInput['progresion'],
    dias: [{ diaSemana: null, nombre: title, ejercicios: exercises }],
  };
}

/** Nombre sugerido: «Entreno del lunes 8 de noviembre». */
export function suggestedRoutineName(now: Date = new Date()): string {
  const text = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long' }).format(now);
  return `Entreno del ${text}`;
}

/** Nuevo orden (1..n) tras mover un ejercicio una posición; `null` si no se puede. */
export function moveExercise<T extends { id: string }>(items: readonly T[], id: string, direction: -1 | 1): T[] | null {
  const from = items.findIndex((item) => item.id === id);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= items.length) return null;
  const next = [...items];
  const [picked] = next.splice(from, 1);
  next.splice(to, 0, picked!);
  return next;
}
