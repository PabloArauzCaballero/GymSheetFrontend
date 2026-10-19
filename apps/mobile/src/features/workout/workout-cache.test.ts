/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { SkippedSet, Workout, WorkoutExercise, WorkoutSet } from '@gymsheet/types';
import { withExercise, withoutSet, withoutSkippedSet, withSavedSet, withSkippedSet } from './workout-cache.ts';

const set = (id: string, numeroSerie: number): WorkoutSet =>
  ({ id, numeroSerie, repeticiones: 8, pesoKg: 60, rir: 2, descansoSegAnterior: 90, fechaRegistro: '2026-10-18T10:00:00Z' }) as WorkoutSet;
const skip = (id: string, numeroSerie: number): SkippedSet => ({ id, numeroSerie, motivo: 'OTRO', nota: null, fechaRegistro: '2026-10-18T10:00:00Z' });
const exercise = (id: string, series: WorkoutSet[] = [], saltadas: SkippedSet[] = []): WorkoutExercise =>
  ({ id, orden: 1, series, saltadas, omitido: null }) as unknown as WorkoutExercise;
const workout = (ejercicios: WorkoutExercise[]): Workout => ({ id: 'w', ejercicios }) as unknown as Workout;

describe('workout-cache', () => {
  it('añade la serie en orden y la quita de saltadas', () => {
    const before = workout([exercise('a', [set('s1', 1), set('s3', 3)], [skip('k2', 2)]), exercise('b')]);
    const after = withSavedSet(before, 'a', set('s2', 2));
    assert.deepEqual(after.ejercicios[0]!.series.map((s) => s.id), ['s1', 's2', 's3']);
    assert.equal(after.ejercicios[0]!.saltadas.length, 0);
    assert.equal(after.ejercicios[1], before.ejercicios[1]);
  });

  it('una serie repetida (doble toque) no se duplica', () => {
    const before = workout([exercise('a', [set('s1', 1)])]);
    assert.equal(withSavedSet(before, 'a', set('s1', 1)).ejercicios[0]!.series.length, 1);
  });

  it('un ejercicio que no está deja la sesión igual', () => {
    const before = workout([exercise('a')]);
    assert.equal(withSavedSet(before, 'zz', set('s1', 1)), before);
    assert.equal(withoutSet(before, 'nope'), before);
  });

  it('deshace una serie por id', () => {
    const before = workout([exercise('a'), exercise('b', [set('s1', 1), set('s2', 2)])]);
    assert.deepEqual(withoutSet(before, 's2').ejercicios[1]!.series.map((s) => s.id), ['s1']);
  });

  it('salta y recupera una serie', () => {
    const before = workout([exercise('a', [], [skip('k1', 1)])]);
    const skipped = withSkippedSet(before, 'a', skip('k1b', 1));
    assert.deepEqual(skipped.ejercicios[0]!.saltadas.map((s) => s.id), ['k1b']);
    assert.equal(withoutSkippedSet(skipped, 'a', 'k1b').ejercicios[0]!.saltadas.length, 0);
  });

  it('sustituye o añade un ejercicio entero', () => {
    const before = workout([exercise('a'), exercise('b')]);
    const replaced = withExercise(before, exercise('a', [set('s1', 1)]));
    assert.equal(replaced.ejercicios.length, 2);
    assert.equal(replaced.ejercicios[0]!.series.length, 1);
    assert.equal(withExercise(before, exercise('c')).ejercicios.length, 3);
  });
});
