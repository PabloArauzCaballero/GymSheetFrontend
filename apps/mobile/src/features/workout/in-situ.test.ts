/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { WorkoutExercise } from '@gymsheet/types';
import { moveExercise, routineFromSession } from './in-situ';

const set = (n: number, reps: number | null, kg: number | null, rest = 90, extra: Record<string, unknown> = {}) => ({
  id: `s${n}`,
  numeroSerie: n,
  tipoSerie: 'FUERZA' as const,
  repeticiones: reps,
  pesoKg: kg,
  rir: 2,
  duracionSeg: null,
  distanciaM: null,
  fcMedia: null,
  rpe: null,
  descansoSegAnterior: rest,
  fechaRegistro: '2026-11-08T10:00:00Z',
  ...extra,
});

const exercise = (id: string, orden: number, series: ReturnType<typeof set>[], extra: Partial<WorkoutExercise> = {}) =>
  ({
    id: `se-${id}`,
    orden,
    esEnfasis: false,
    nota: null,
    seriesObjetivo: null,
    repsMin: null,
    repsMax: null,
    pesoObjetivoKg: null,
    rirObjetivo: null,
    descansoSeg: null,
    descansoEntreSeg: null,
    duracionSeg: null,
    grupo: null,
    grupoTipo: null,
    ejercicio: { id, nombre: id } as WorkoutExercise['ejercicio'],
    series,
    saltadas: [],
    omitido: null,
    ...extra,
  }) as WorkoutExercise;

describe('routineFromSession', () => {
  it('convierte lo hecho en objetivos, en el orden entrenado', () => {
    const body = routineFromSession(
      {
        ejercicios: [
          exercise('remo', 2, [set(1, 12, 40)]),
          exercise('banca', 1, [set(1, 8, 60, 0), set(2, 10, 62.5, 100), set(3, 6, 65, 120)]),
        ],
      },
      '  Pecho y espalda ',
    );
    assert.equal(body?.nombre, 'Pecho y espalda');
    assert.equal(body?.visibilidad, 'PRIVATE');
    const [banca, remo] = body!.dias[0]!.ejercicios;
    assert.deepEqual({ ...banca }, { ejercicioId: 'banca', seriesObjetivo: 3, repsMin: 6, repsMax: 10, pesoObjetivoKg: 65, rirObjetivo: 2, descansoSeg: 110, nota: null, duracionSeg: null });
    assert.equal(remo?.ejercicioId, 'remo');
  });

  it('deja fuera omitidos y ejercicios sin series, y devuelve null si no queda nada', () => {
    const omitted = exercise('a', 1, [set(1, 10, 20)], { omitido: { motivo: 'DOLOR', nota: null, fecha: '' } });
    const empty = exercise('b', 2, []);
    assert.equal(routineFromSession({ ejercicios: [omitted, empty] }, 'x'), null);
  });

  it('una serie por tiempo guarda la duración y no las repeticiones', () => {
    const plank = exercise('plancha', 1, [set(1, null, null, 60, { duracionSeg: 45 }), set(2, null, null, 60, { duracionSeg: 60 })]);
    const [item] = routineFromSession({ ejercicios: [plank] }, 'Core')!.dias[0]!.ejercicios;
    assert.equal(item?.duracionSeg, 60);
    assert.equal(item?.repsMin, null);
    assert.equal(item?.repsMax, null);
  });

  it('respeta los topes de series', () => {
    const many = exercise('curl', 1, Array.from({ length: 14 }, (_, i) => set(i + 1, 10, 10)));
    assert.equal(routineFromSession({ ejercicios: [many] }, 'Brazos')!.dias[0]!.ejercicios[0]!.seriesObjetivo, 10);
  });
});

describe('moveExercise', () => {
  const list = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  it('sube y baja una posición', () => {
    assert.deepEqual(moveExercise(list, 'b', -1)?.map((i) => i.id), ['b', 'a', 'c']);
    assert.deepEqual(moveExercise(list, 'b', 1)?.map((i) => i.id), ['a', 'c', 'b']);
  });
  it('no se sale de los extremos', () => {
    assert.equal(moveExercise(list, 'a', -1), null);
    assert.equal(moveExercise(list, 'c', 1), null);
  });
});
