import { routineExerciseLimits as limits } from '@gymsheet/types';
import type { DraftExercise } from './model';

/**
 * Superseries y circuitos del borrador (C3.d). Un bloque son los ejercicios
 * **contiguos** de un día con el mismo `grupo`; el número es local al borrador
 * y el backend lo recibe renumerado 1, 2… por orden de aparición.
 */

let uidCounter = 0;

/**
 * Clave local de un ejercicio del borrador. Identifica la fila, no el
 * ejercicio: el mismo press puede ir dos veces en un día (en dos bloques).
 */
export function newDraftUid(): string {
  uidCounter += 1;
  const random = Math.random().toString(36).slice(2, 10);
  return `dx-${Date.now().toString(36)}-${uidCounter.toString(36)}-${random}`;
}

/** Corridas de ejercicios contiguos con el mismo `grupo` (un suelto es una corrida de uno). */
function runsOf(list: readonly DraftExercise[]): DraftExercise[][] {
  const runs: DraftExercise[][] = [];
  for (const exercise of list) {
    const last = runs[runs.length - 1];
    const prev = last?.[last.length - 1];
    if (last && prev && exercise.grupo !== null && prev.grupo === exercise.grupo) {
      last.push(exercise);
    } else {
      runs.push([exercise]);
    }
  }
  return runs;
}

function ungroup(exercise: DraftExercise): DraftExercise {
  return exercise.grupo === null && exercise.descansoEntreSeg === null
    ? exercise
    : { ...exercise, grupo: null, descansoEntreSeg: null };
}

/**
 * Deja la lista de un día coherente tras cualquier cambio: un bloque partido
 * (por mover o quitar un ejercicio) se separa en bloques distintos, un bloque
 * de uno vuelve a ser suelto, y fuera de un bloque no hay transición.
 * Siempre devuelve una lista nueva; las filas que no cambian conservan su referencia.
 */
export function normalizeGroups(list: readonly DraftExercise[]): DraftExercise[] {
  const seen = new Set<number>();
  let next = Math.max(0, ...list.map((exercise) => exercise.grupo ?? 0));
  let changed = false;
  const out: DraftExercise[] = [];
  for (const run of runsOf(list)) {
    const first = run[0];
    if (!first) continue;
    if (first.grupo === null || run.length < 2) {
      for (const exercise of run) {
        const fixed = ungroup(exercise);
        if (fixed !== exercise) changed = true;
        out.push(fixed);
      }
      continue;
    }
    let id = first.grupo;
    if (seen.has(id)) {
      next += 1;
      id = next;
      changed = true;
    }
    seen.add(id);
    for (const exercise of run)
      out.push(exercise.grupo === id ? exercise : { ...exercise, grupo: id });
  }
  return changed ? out : [...list];
}

/**
 * Une en un bloque los ejercicios indicados. Tienen que ser al menos 2 y
 * contiguos; si alguno ya estaba en un bloque, el bloque entero se suma al
 * nuevo (unir A2 con el siguiente da un circuito A1-A2-X). `null` si no se puede.
 */
export function joinGroup(
  list: readonly DraftExercise[],
  uids: readonly string[],
): DraftExercise[] | null {
  const wanted = new Set(uids);
  let indexes = list.flatMap((exercise, index) => (wanted.has(exercise.uid) ? [index] : []));
  if (indexes.length < 2 || indexes.length !== wanted.size) return null;
  const touched = new Set(
    indexes.map((index) => list[index]?.grupo).filter((grupo): grupo is number => grupo != null),
  );
  if (touched.size > 0) {
    indexes = [
      ...new Set([
        ...indexes,
        ...list.flatMap((exercise, index) =>
          exercise.grupo !== null && touched.has(exercise.grupo) ? [index] : [],
        ),
      ]),
    ].sort((a, b) => a - b);
  }
  const from = indexes[0] ?? 0;
  if (indexes.some((value, position) => value !== from + position)) return null;
  const members = new Set(indexes);
  const grupo = Math.max(0, ...list.map((exercise) => exercise.grupo ?? 0)) + 1;
  const descansoEntreSeg =
    indexes.map((index) => list[index]?.descansoEntreSeg).find((value) => value != null) ?? 0;
  return normalizeGroups(
    list.map((exercise, index) =>
      members.has(index) ? { ...exercise, grupo, descansoEntreSeg } : exercise,
    ),
  );
}

/** Deshace un bloque: sus ejercicios vuelven a ser sueltos. */
export function splitGroup(list: readonly DraftExercise[], grupo: number): DraftExercise[] {
  return list.map((exercise) => (exercise.grupo === grupo ? ungroup(exercise) : exercise));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

/** Transición entre los ejercicios de un bloque, acotada a 0–60 s. */
export function setGroupRest(
  list: readonly DraftExercise[],
  grupo: number,
  descansoEntreSeg: number,
): DraftExercise[] {
  const value = clamp(descansoEntreSeg, 0, limits.descansoEntreMax);
  return list.map((exercise) =>
    exercise.grupo === grupo ? { ...exercise, descansoEntreSeg: value } : exercise,
  );
}

/** Acota una duración de serie por tiempo a 1–3600 s. */
export function clampDuration(seconds: number): number {
  return clamp(seconds, limits.duracionMin, limits.duracionMax);
}

/**
 * Los bloques de un día renumerados 1, 2… por orden de aparición, como los
 * guarda el backend. Lo que no forma un bloque válido sale suelto (`null`).
 */
export function renumberGroups(list: readonly DraftExercise[]): Array<number | null> {
  const out: Array<number | null> = [];
  let next = 0;
  for (const run of runsOf(list)) {
    const grouped = run.length >= 2 && run[0]?.grupo != null;
    if (grouped) next += 1;
    for (let i = 0; i < run.length; i += 1) out.push(grouped ? next : null);
  }
  return out;
}

export type DayExerciseIssue = {
  codigo: 'GRUPO_INVALIDO' | 'FUERA_DE_RANGO';
  mensaje: string;
  /** Fila afectada, si el problema es de un ejercicio. */
  uid?: string;
  grupo?: number;
};

/**
 * Lo que el backend rechazaría de un día: un bloque de 1 ejercicio o partido
 * (`400 ROUTINE_GROUP_INVALID`) y los topes de series (1–10), repeticiones
 * (1–50), transición (0–60 s) y duración (1–3600 s).
 */
export function validateDayExercises(list: readonly DraftExercise[]): DayExerciseIssue[] {
  const issues: DayExerciseIssue[] = [];
  const runsByGroup = new Map<number, number[]>();
  for (const run of runsOf(list)) {
    const grupo = run[0]?.grupo;
    if (grupo == null) continue;
    runsByGroup.set(grupo, [...(runsByGroup.get(grupo) ?? []), run.length]);
  }
  for (const [grupo, runs] of runsByGroup) {
    if (runs.length > 1 || (runs[0] ?? 0) < 2) {
      issues.push({
        codigo: 'GRUPO_INVALIDO',
        mensaje: 'Una superserie necesita al menos 2 ejercicios seguidos',
        grupo,
      });
    }
  }
  for (const exercise of list) {
    const name = exercise.nombre;
    const sets = exercise.seriesObjetivo;
    if (!Number.isInteger(sets) || sets < limits.seriesMin || sets > limits.seriesMax) {
      issues.push({
        codigo: 'FUERA_DE_RANGO',
        mensaje: `${name}: las series van de ${limits.seriesMin} a ${limits.seriesMax}`,
        uid: exercise.uid,
      });
    }
    if (exercise.duracionSeg != null) {
      if (exercise.duracionSeg < limits.duracionMin || exercise.duracionSeg > limits.duracionMax) {
        issues.push({
          codigo: 'FUERA_DE_RANGO',
          mensaje: `${name}: la duración va de ${limits.duracionMin} a ${limits.duracionMax} s`,
          uid: exercise.uid,
        });
      }
    } else {
      const reps = [exercise.repsMin, exercise.repsMax].filter(
        (value): value is number => value !== null,
      );
      if (
        reps.some(
          (value) => !Number.isInteger(value) || value < limits.repsMin || value > limits.repsMax,
        )
      ) {
        issues.push({
          codigo: 'FUERA_DE_RANGO',
          mensaje: `${name}: las repeticiones van de ${limits.repsMin} a ${limits.repsMax}`,
          uid: exercise.uid,
        });
      }
    }
    if (
      exercise.grupo !== null &&
      exercise.descansoEntreSeg != null &&
      (exercise.descansoEntreSeg < 0 || exercise.descansoEntreSeg > limits.descansoEntreMax)
    ) {
      issues.push({
        codigo: 'FUERA_DE_RANGO',
        mensaje: `${name}: el descanso entre ejercicios va de 0 a ${limits.descansoEntreMax} s`,
        uid: exercise.uid,
      });
    }
  }
  return issues;
}
