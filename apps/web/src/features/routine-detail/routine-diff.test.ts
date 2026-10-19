import { describe, expect, it } from 'vitest';
import type { Routine } from '@gymsheet/types';
import { diffRoutines } from './routine-diff';

const ex = (id: string, name: string, series = 3, repsMax = 10) => ({
  id: `re-${id}`,
  orden: 1,
  seriesObjetivo: series,
  repsMin: 6,
  repsMax,
  pesoObjetivoKg: null,
  rirObjetivo: null,
  descansoSeg: null,
  nota: null,
  ejercicio: { id, nombre: name } as never,
});
const day = (id: string, weekday: number | null, name: string | null, exercises: ReturnType<typeof ex>[]) => ({
  id,
  diaSemana: weekday,
  nombre: name,
  orden: 1,
  ejercicios: exercises,
});
const routine = (days: ReturnType<typeof day>[]) => ({ dias: days }) as unknown as Routine;

describe('diferencias entre una copia y su original', () => {
  it('no dice nada si son iguales', () => {
    const base = routine([day('d', 1, 'Empuje', [ex('a', 'Press')])]);
    expect(diffRoutines(base, base)).toEqual([]);
  });

  it('lista ejercicios añadidos, quitados y ajustados', () => {
    const copy = routine([day('d', 1, 'Empuje', [ex('a', 'Press'), ex('b', 'Fondos')])]);
    const source = routine([day('d2', 1, 'Empuje', [ex('a', 'Press', 5), ex('c', 'Aperturas')])]);
    const lines = diffRoutines(copy, source).map((line) => line.tipo);
    expect(lines.sort()).toEqual(['ajuste', 'ejercicio-nuevo', 'ejercicio-quitado']);
  });

  it('lista días nuevos y quitados', () => {
    const copy = routine([day('d', 1, 'Empuje', [ex('a', 'Press')])]);
    const source = routine([day('d2', 3, 'Pierna', [ex('s', 'Sentadilla')])]);
    expect(diffRoutines(copy, source).map((line) => line.texto)).toEqual([
      'Día nuevo: Pierna (1 ejercicio)',
      'Día que se quita: Empuje',
    ]);
  });
});
