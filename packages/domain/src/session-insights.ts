import type { Workout } from '@gymsheet/types';
import { isStrengthSet, workoutVolume } from './training-metrics';

/** Una marca personal batida en la sesión: la serie más pesada de un ejercicio. */
export interface SessionRecord {
  readonly exerciseId: string;
  readonly exerciseName: string;
  readonly pesoKg: number;
  readonly repeticiones: number;
  /** La mejor marca anterior; `null` si es la primera vez que se registra. */
  readonly previousKg: number | null;
}

export interface SessionComparison {
  /** Volumen de la sesión finalizada anterior. */
  readonly previousVolumeKg: number;
  /** Cambio redondeado en %, con signo. */
  readonly changePct: number;
  readonly direction: 'up' | 'down' | 'flat';
}

export interface SessionInsights {
  readonly volumeKg: number;
  readonly sets: number;
  readonly records: readonly SessionRecord[];
  /** `null` sin sesión anterior comparable (o si la anterior no movió carga). */
  readonly comparison: SessionComparison | null;
}

function heaviest(workout: Workout, exerciseId: string): { pesoKg: number; repeticiones: number } | null {
  let best: { pesoKg: number; repeticiones: number } | null = null;
  for (const item of workout.ejercicios) {
    if (item.ejercicio?.id !== exerciseId) continue;
    for (const set of item.series) {
      if (!isStrengthSet(set) || set.pesoKg <= 0) continue;
      if (!best || set.pesoKg > best.pesoKg || (set.pesoKg === best.pesoKg && set.repeticiones > best.repeticiones)) {
        best = { pesoKg: set.pesoKg, repeticiones: set.repeticiones };
      }
    }
  }
  return best;
}

/**
 * Lo que el resumen de sesión cuenta además de los puntos (C8.3.6): volumen,
 * series, récords y la comparación con la sesión anterior.
 *
 * Un récord es la serie más pesada de un ejercicio **por encima** de la mejor
 * de todas las sesiones finalizadas anteriores con historial de ese ejercicio.
 * La primera vez que se hace un ejercicio no es un récord: sin pasado no hay
 * marca que batir, y celebrar cada estreno vaciaría la celebración.
 */
export function sessionInsights(session: Workout, history: readonly Workout[]): SessionInsights {
  const previous = history
    .filter(
      (item) =>
        item.id !== session.id &&
        item.estado === 'FINALIZADA' &&
        new Date(item.fechaInicio).getTime() < new Date(session.fechaInicio).getTime(),
    )
    .sort((a, b) => new Date(b.fechaInicio).getTime() - new Date(a.fechaInicio).getTime());

  const records: SessionRecord[] = [];
  const seen = new Set<string>();
  for (const item of session.ejercicios) {
    const exercise = item.ejercicio;
    if (!exercise || seen.has(exercise.id)) continue;
    seen.add(exercise.id);
    const today = heaviest(session, exercise.id);
    if (!today) continue;
    let before: number | null = null;
    for (const past of previous) {
      const best = heaviest(past, exercise.id);
      if (best && (before === null || best.pesoKg > before)) before = best.pesoKg;
    }
    if (before !== null && today.pesoKg > before) {
      records.push({
        exerciseId: exercise.id,
        exerciseName: exercise.nombreEs?.trim() || exercise.nombre,
        pesoKg: today.pesoKg,
        repeticiones: today.repeticiones,
        previousKg: before,
      });
    }
  }

  const volumeKg = workoutVolume(session);
  const sets = session.ejercicios.reduce((total, item) => total + item.series.length, 0);
  const last = previous[0];
  const previousVolumeKg = last ? workoutVolume(last) : 0;
  let comparison: SessionComparison | null = null;
  if (last && previousVolumeKg > 0) {
    const changePct = Math.round(((volumeKg - previousVolumeKg) / previousVolumeKg) * 100);
    comparison = {
      previousVolumeKg,
      changePct,
      direction: changePct > 0 ? 'up' : changePct < 0 ? 'down' : 'flat',
    };
  }
  return { volumeKg, sets, records, comparison };
}
