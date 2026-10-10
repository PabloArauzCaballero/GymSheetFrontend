import { describe, expect, it } from 'vitest';
import type { Routine, RoutineCalendar } from '@gymsheet/types';
import { buildWeeks, dayTitle, isAnyDayRoutine, lineSummary, repsLabel, weekColumns } from './view-model';

const exercise = (id: string, name: string) => ({
  id,
  orden: 1,
  seriesObjetivo: 4,
  repsMin: 8,
  repsMax: 12,
  pesoObjetivoKg: 60,
  rirObjetivo: null,
  descansoSeg: null,
  nota: null,
  ejercicio: { id: `ex-${id}`, nombre: name } as never,
});

const routine = {
  dias: [
    { id: 'd1', diaSemana: 1, nombre: 'Empuje', orden: 1, ejercicios: [exercise('re1', 'Press banca')] },
    { id: 'd2', diaSemana: 3, nombre: null, orden: 2, ejercicios: [exercise('re2', 'Sentadilla')] },
  ],
} as unknown as Routine;

const calendar: RoutineCalendar = {
  rutinaId: 'r',
  duracionSemanas: 2,
  progresion: {},
  semanas: [
    {
      numero: 1,
      esDescarga: false,
      factorVolumen: 1,
      factorCarga: 1,
      nota: null,
      dias: [{ diaId: 'd1', diaSemana: 1, nombre: 'Empuje', ejercicios: [{ routineExerciseId: 're1', ejercicioId: 'ex-re1', orden: 1, series: 4, repsMin: 8, repsMax: 12, pesoObjetivoKg: 60 }] }],
    },
    {
      numero: 2,
      esDescarga: true,
      factorVolumen: 0.5,
      factorCarga: 0.9,
      nota: null,
      dias: [{ diaId: 'd1', diaSemana: 1, nombre: 'Empuje', ejercicios: [{ routineExerciseId: 're1', ejercicioId: 'ex-re1', orden: 1, series: 2, repsMin: 8, repsMax: 12, pesoObjetivoKg: 54 }] }],
    },
  ],
};

describe('modelo de la vista Semana/Mes', () => {
  it('pone el nombre del ejercicio y las series ajustadas de cada semana', () => {
    const weeks = buildWeeks(routine, calendar);
    expect(weeks).toHaveLength(2);
    expect(weeks[0]?.dias[0]?.ejercicios[0]).toMatchObject({ nombre: 'Press banca', series: 4 });
    expect(weeks[1]?.esDescarga).toBe(true);
    expect(weeks[1]?.dias[0]?.ejercicios[0]).toMatchObject({ series: 2, pesoKg: 54 });
  });

  it('sin calendario usa la semana base de la rutina', () => {
    const weeks = buildWeeks(routine, null);
    expect(weeks).toHaveLength(1);
    expect(weeks[0]?.dias.map((day) => day.diaId)).toEqual(['d1', 'd2']);
  });

  it('reparte los días en las siete columnas y deja vacíos los de descanso', () => {
    const columns = weekColumns(buildWeeks(routine, null)[0]!);
    expect(columns).toHaveLength(7);
    expect(columns.filter((column) => column.day).map((column) => column.dia)).toEqual([1, 3]);
  });

  it('reconoce una rutina de cualquier día', () => {
    const plain = { dias: [{ id: 'x', diaSemana: null, nombre: null, orden: 1, ejercicios: [] }] } as unknown as Routine;
    expect(isAnyDayRoutine(buildWeeks(plain, null))).toBe(true);
    expect(isAnyDayRoutine(buildWeeks(routine, null))).toBe(false);
  });

  it('titula el día con su nombre, el día de la semana o «Cualquier día»', () => {
    const [first, second] = buildWeeks(routine, null)[0]!.dias;
    const name = (dia: number) => (dia === 3 ? 'Miércoles' : 'Lunes');
    expect(dayTitle(first!, name as never)).toBe('Empuje');
    expect(dayTitle(second!, name as never)).toBe('Miércoles');
    expect(dayTitle({ ...second!, diaSemana: null }, name as never)).toBe('Cualquier día');
  });

  it('resume series, repeticiones y peso', () => {
    expect(repsLabel({ repsMin: 8, repsMax: 12 })).toBe('8–12');
    expect(repsLabel({ repsMin: 5, repsMax: 5 })).toBe('5');
    expect(repsLabel({ repsMin: null, repsMax: null })).toBeNull();
    const line = buildWeeks(routine, calendar)[0]!.dias[0]!.ejercicios[0]!;
    expect(lineSummary(line)).toBe('4 series × 8–12 reps · 60 kg');
    expect(lineSummary({ ...line, series: 1, repsMin: null, repsMax: null, pesoKg: null })).toBe('1 serie');
  });
});
