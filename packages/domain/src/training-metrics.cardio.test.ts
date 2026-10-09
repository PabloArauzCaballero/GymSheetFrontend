import { describe, expect, it } from 'vitest';
import type { Workout, WorkoutExercise, WorkoutSet } from '@gymsheet/types';
import { setVolume, topSet, workoutVolume } from './training-metrics';

const strength = (pesoKg: number, repeticiones: number): WorkoutSet => ({
  id: 's', numeroSerie: 1, tipoSerie: 'FUERZA', repeticiones, pesoKg, rir: 2,
  duracionSeg: null, distanciaM: null, fcMedia: null, rpe: null, descansoSegAnterior: 0, fechaRegistro: '2026-10-01',
});
const cardio = (duracionSeg: number): WorkoutSet => ({
  id: 'c', numeroSerie: 1, tipoSerie: 'CARDIO', repeticiones: null, pesoKg: null, rir: null,
  duracionSeg, distanciaM: 5000, fcMedia: 140, rpe: 4, descansoSegAnterior: 0, fechaRegistro: '2026-10-01',
});
const exercise = (series: WorkoutSet[]): WorkoutExercise => ({
  id: 'e', orden: 1, esEnfasis: false, nota: null, ejercicio: null, series,
});
const workout = (...exercises: WorkoutExercise[]): Workout =>
  ({ id: 'w', usuarioId: 'u', fechaInicio: '2026-10-01', fechaFin: null, estado: 'FINALIZADA', observacion: null, ejercicios: exercises }) as Workout;

describe('series de cardio y sumas de kilos (regresión RF-17)', () => {
  it('una serie de cardio aporta cero kilos', () => {
    expect(setVolume(null, null)).toBe(0);
    expect(setVolume(60, null)).toBe(0);
    expect(setVolume(60, 10)).toBe(600);
  });
  it('una sesión mixta no cambia el volumen de fuerza', () => {
    const onlyStrength = workout(exercise([strength(60, 10), strength(80, 5)]));
    const mixed = workout(exercise([strength(60, 10), strength(80, 5)]), exercise([cardio(1900)]));
    expect(workoutVolume(onlyStrength)).toBe(1000);
    expect(workoutVolume(mixed)).toBe(workoutVolume(onlyStrength));
    expect(Number.isNaN(workoutVolume(mixed))).toBe(false);
  });
  it('la serie más pesada ignora el cardio y es nula si solo hay cardio', () => {
    expect(topSet(exercise([cardio(600), strength(100, 3), strength(90, 5)]))).toEqual({ pesoKg: 100, repeticiones: 3 });
    expect(topSet(exercise([cardio(600)]))).toBeNull();
  });
});
