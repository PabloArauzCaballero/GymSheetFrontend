import type { SkippedSet, Workout, WorkoutExercise, WorkoutSet } from '@gymsheet/types';

/**
 * Cambios de una sesión en vivo aplicados sobre la copia en caché, con lo que
 * devuelve el servidor. Así registrar una serie no vuelve a pedir la sesión
 * entera ni el historial: el servidor contesta con la fila nueva y basta.
 * Funciones puras: no tocan la caché, devuelven la sesión nueva.
 */

function mapExercise(workout: Workout, exerciseId: string, change: (item: WorkoutExercise) => WorkoutExercise): Workout {
  let found = false;
  const ejercicios = workout.ejercicios.map((item) => {
    if (item.id !== exerciseId) return item;
    found = true;
    return change(item);
  });
  return found ? { ...workout, ejercicios } : workout;
}

/** Serie registrada: entra (o sustituye a la misma) y deja de constar como saltada. */
export function withSavedSet(workout: Workout, exerciseId: string, set: WorkoutSet): Workout {
  return mapExercise(workout, exerciseId, (item) => ({
    ...item,
    series: [...item.series.filter((s) => s.id !== set.id && s.numeroSerie !== set.numeroSerie), set].sort(
      (a, b) => a.numeroSerie - b.numeroSerie,
    ),
    saltadas: item.saltadas.filter((s) => s.numeroSerie !== set.numeroSerie),
  }));
}

/** Serie deshecha. */
export function withoutSet(workout: Workout, setId: string): Workout {
  const owner = workout.ejercicios.find((item) => item.series.some((s) => s.id === setId));
  if (!owner) return workout;
  return mapExercise(workout, owner.id, (item) => ({ ...item, series: item.series.filter((s) => s.id !== setId) }));
}

/** Serie saltada (repetirlo corrige el motivo: sustituye a la del mismo número). */
export function withSkippedSet(workout: Workout, exerciseId: string, skip: SkippedSet): Workout {
  return mapExercise(workout, exerciseId, (item) => ({
    ...item,
    saltadas: [...item.saltadas.filter((s) => s.numeroSerie !== skip.numeroSerie), skip].sort(
      (a, b) => a.numeroSerie - b.numeroSerie,
    ),
  }));
}

/** Serie que deja de estar saltada. */
export function withoutSkippedSet(workout: Workout, exerciseId: string, skipId: string): Workout {
  return mapExercise(workout, exerciseId, (item) => ({ ...item, saltadas: item.saltadas.filter((s) => s.id !== skipId) }));
}

/** Ejercicio que el servidor devuelve entero (omitido, recuperado o recién añadido). */
export function withExercise(workout: Workout, exercise: WorkoutExercise): Workout {
  const exists = workout.ejercicios.some((item) => item.id === exercise.id);
  const ejercicios = exists
    ? workout.ejercicios.map((item) => (item.id === exercise.id ? exercise : item))
    : [...workout.ejercicios, exercise];
  return { ...workout, ejercicios };
}
