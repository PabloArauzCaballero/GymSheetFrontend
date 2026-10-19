import { describe, expect, it } from 'vitest';
import type { Workout, WorkoutExercise, WorkoutSet } from '@gymsheet/types';
import {
  isStrengthSet,
  isTimedSet,
  longestTimedSet,
  previousPerformance,
  setVolumeKg,
  summariseTraining,
  topSet,
  workoutVolume,
} from './training-metrics';

const base = {
  numeroSerie: 1, tipoSerie: 'FUERZA' as const, rir: null, distanciaM: null, fcMedia: null, rpe: null,
  descansoSegAnterior: 0, fechaRegistro: '2026-10-01T10:00:00Z',
};
const strength = (pesoKg: number, repeticiones: number): WorkoutSet => ({
  ...base, id: `s${pesoKg}`, repeticiones, pesoKg, rir: 2, duracionSeg: null,
});
/** Plancha: segundos y, a veces, lastre; nunca repeticiones. */
const timed = (duracionSeg: number, pesoKg: number | null = null): WorkoutSet => ({
  ...base, id: `t${duracionSeg}`, repeticiones: null, pesoKg, duracionSeg,
});
const exercise = (id: string, series: WorkoutSet[]): WorkoutExercise => ({
  id, orden: 1, esEnfasis: false, nota: null, series, saltadas: [], omitido: null,
  ejercicio: { id } as WorkoutExercise['ejercicio'],
  seriesObjetivo: 3, repsMin: null, repsMax: null, pesoObjetivoKg: null, rirObjetivo: null,
  descansoSeg: null, descansoEntreSeg: null, duracionSeg: 45, grupo: null, grupoTipo: null,
});
const workout = (id: string, ...exercises: WorkoutExercise[]): Workout =>
  ({ id, usuarioId: 'u', fechaInicio: '2026-10-01T10:00:00Z', fechaFin: null, estado: 'FINALIZADA', observacion: null, ejercicios: exercises }) as Workout;

describe('series de fuerza por tiempo', () => {
  it('se reconocen y no son series de carga', () => {
    expect(isTimedSet(timed(45))).toBe(true);
    expect(isTimedSet(strength(60, 10))).toBe(false);
    expect(isStrengthSet(timed(45, 10))).toBe(false);
  });

  it('no suman kilos ni producen NaN, aunque lleven lastre', () => {
    expect(setVolumeKg(timed(45, 20))).toBe(0);
    const session = workout('w', exercise('press', [strength(60, 10)]), exercise('plancha', [timed(45, 20), timed(60)]));
    expect(workoutVolume(session)).toBe(600);
    const summary = summariseTraining([session], new Date('2026-10-02T10:00:00Z'));
    expect(Number.isNaN(summary.thisWeek.volumeKg)).toBe(false);
  });

  it('la mejor serie de carga los ignora; el aguante más largo los usa', () => {
    const plank = exercise('plancha', [timed(45, 20), timed(60)]);
    expect(topSet(plank)).toBeNull();
    expect(longestTimedSet(plank)).toBe(60);
    expect(longestTimedSet(exercise('press', [strength(60, 10)]))).toBeNull();
  });

  it('la última vez de un ejercicio por tiempo se busca con isTimedSet', () => {
    const history = [workout('antes', exercise('plancha', [timed(40)])), workout('hoy', exercise('plancha', []))];
    expect(previousPerformance(history, 'plancha', 'hoy')).toBeNull();
    expect(previousPerformance(history, 'plancha', 'hoy', isTimedSet)?.workout.id).toBe('antes');
  });
});
