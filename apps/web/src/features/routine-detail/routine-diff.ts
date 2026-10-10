import { WEEKDAY_NAMES, countLabel, type Weekday } from '@gymsheet/hooks';
import type { Routine, RoutineDay } from '@gymsheet/types';

export type DiffLine = {
  tipo: 'dia-nuevo' | 'dia-quitado' | 'ejercicio-nuevo' | 'ejercicio-quitado' | 'ajuste';
  texto: string;
};

const keyOf = (day: RoutineDay) => (day.diaSemana === null ? 'x' : String(day.diaSemana));

function titleOf(day: RoutineDay): string {
  if (day.nombre) return day.nombre;
  return day.diaSemana ? WEEKDAY_NAMES[day.diaSemana as Weekday] : 'Cualquier día';
}

const nameOf = (exercise: RoutineDay['ejercicios'][number]) => exercise.ejercicio?.nombre ?? 'Ejercicio';
const idOf = (exercise: RoutineDay['ejercicios'][number]) => exercise.ejercicio?.id ?? exercise.id;

/**
 * Qué cambiaría en una copia si se aplica la versión nueva del original (RF-10):
 * días y ejercicios que se añaden o se quitan, y los que cambian de series o
 * repeticiones. Sirve para enseñar la lista antes de decidir (D2: nada se aplica solo).
 */
export function diffRoutines(copy: Routine, source: Routine): DiffLine[] {
  const lines: DiffLine[] = [];
  const mine = new Map(copy.dias.map((day) => [keyOf(day), day]));
  const theirs = new Map(source.dias.map((day) => [keyOf(day), day]));

  for (const [key, day] of theirs) {
    const own = mine.get(key);
    if (!own) {
      lines.push({ tipo: 'dia-nuevo', texto: `Día nuevo: ${titleOf(day)} (${countLabel(day.ejercicios.length)})` });
      continue;
    }
    const before = new Map(own.ejercicios.map((exercise) => [idOf(exercise), exercise]));
    const after = new Map(day.ejercicios.map((exercise) => [idOf(exercise), exercise]));
    for (const [id, exercise] of after) {
      const old = before.get(id);
      if (!old) {
        lines.push({ tipo: 'ejercicio-nuevo', texto: `${titleOf(day)}: se añade ${nameOf(exercise)}` });
      } else if (
        old.seriesObjetivo !== exercise.seriesObjetivo ||
        old.repsMin !== exercise.repsMin ||
        old.repsMax !== exercise.repsMax
      ) {
        lines.push({ tipo: 'ajuste', texto: `${titleOf(day)}: cambian las series o repeticiones de ${nameOf(exercise)}` });
      }
    }
    for (const [id, exercise] of before) {
      if (!after.has(id)) {
        lines.push({ tipo: 'ejercicio-quitado', texto: `${titleOf(day)}: se quita ${nameOf(exercise)}` });
      }
    }
  }
  for (const [key, day] of mine) {
    if (!theirs.has(key)) lines.push({ tipo: 'dia-quitado', texto: `Día que se quita: ${titleOf(day)}` });
  }
  return lines;
}
