import { describe, expect, it } from 'vitest';
import type { Workout, WorkoutExercise } from '@gymsheet/types';
import { sessionInsights } from './session-insights';

function exercise(id: string, sets: Array<[number, number]>, nombreEs?: string): WorkoutExercise {
  return {
    id: `we-${id}-${sets.length}`,
    orden: 1,
    esEnfasis: false,
    nota: null,
    ejercicio: { id, nombre: `Exercise ${id}`, nombreEs: nombreEs ?? null, grupoMuscular: 'CHEST', media: [] },
    series: sets.map(([pesoKg, repeticiones], index) => ({
      id: `s-${id}-${index}`,
      numeroSerie: index + 1,
      tipoSerie: 'FUERZA',
      repeticiones,
      pesoKg,
      rir: 2,
      duracionSeg: null,
      distanciaM: null,
      fcMedia: null,
      rpe: null,
      descansoSegAnterior: 90,
      fechaRegistro: '2026-10-01T10:00:00.000Z',
    })),
  } as unknown as WorkoutExercise;
}

function workout(id: string, day: number, ejercicios: WorkoutExercise[], estado: Workout['estado'] = 'FINALIZADA'): Workout {
  return {
    id,
    usuarioId: 'u',
    fechaInicio: `2026-10-${String(day).padStart(2, '0')}T10:00:00.000Z`,
    fechaFin: null,
    estado,
    observacion: null,
    ejercicios,
  };
}

describe('sessionInsights', () => {
  const today = workout('today', 10, [exercise('bench', [[80, 8], [85, 5]], 'Press de banca'), exercise('row', [[60, 10]])]);

  it('cuenta volumen y series de la sesión', () => {
    const result = sessionInsights(today, []);
    expect(result.volumeKg).toBe(80 * 8 + 85 * 5 + 60 * 10);
    expect(result.sets).toBe(3);
  });

  it('sin historial no hay récords ni comparación', () => {
    const result = sessionInsights(today, []);
    expect(result.records).toEqual([]);
    expect(result.comparison).toBeNull();
  });

  it('un récord supera la mejor marca de todas las sesiones anteriores', () => {
    const history = [
      workout('a', 3, [exercise('bench', [[82.5, 5]]), exercise('row', [[60, 12]])]),
      workout('b', 6, [exercise('bench', [[80, 6]])]),
    ];
    const result = sessionInsights(today, history);
    expect(result.records).toEqual([
      { exerciseId: 'bench', exerciseName: 'Press de banca', pesoKg: 85, repeticiones: 5, previousKg: 82.5 },
    ]);
  });

  it('igualar la marca no es récord; las sesiones abiertas o posteriores no cuentan', () => {
    const history = [
      workout('a', 3, [exercise('bench', [[85, 8]])]),
      workout('open', 9, [exercise('row', [[40, 10]])], 'EN_PROGRESO'),
      workout('later', 12, [exercise('row', [[50, 10]])]),
    ];
    const result = sessionInsights(today, history);
    expect(result.records).toEqual([]);
  });

  it('compara con la sesión finalizada inmediatamente anterior', () => {
    const history = [
      workout('old', 1, [exercise('bench', [[100, 10]])]),
      workout('prev', 8, [exercise('bench', [[80, 10]])]),
    ];
    const result = sessionInsights(today, history);
    expect(result.comparison).toEqual({ previousVolumeKg: 800, changePct: 108, direction: 'up' });
  });

  it('ignora la propia sesión si viene en el historial', () => {
    const result = sessionInsights(today, [today]);
    expect(result.comparison).toBeNull();
  });
});
