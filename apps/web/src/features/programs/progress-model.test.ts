import { describe, expect, it } from 'vitest';
import type { ProgramWeekProgress } from '@gymsheet/types';
import { goalProgress, hasEnded, summarizeWeeks, weekState } from './progress-model';

const week = (numero: number, cumplida: boolean | null, hechas = 0, plan = 3): ProgramWeekProgress => ({
  numero,
  inicio: '2026-10-05',
  esDescarga: false,
  sesionesPlan: plan,
  sesionesHechas: hechas,
  minutosCardio: 0,
  cumplida,
  multiplicador: null,
});

describe('avance del programa', () => {
  it('distingue semana cumplida, no cumplida, en curso y por venir', () => {
    expect(weekState(week(1, true), 2)).toBe('cumplida');
    expect(weekState(week(1, false), 2)).toBe('incumplida');
    expect(weekState(week(2, null), 2)).toBe('actual');
    expect(weekState(week(3, null), 2)).toBe('pendiente');
  });

  it('resume solo lo cerrado', () => {
    const total = summarizeWeeks([week(1, true, 3), week(2, false, 1), week(3, null, 2)]);
    expect(total).toEqual({ cumplidas: 1, cerradas: 2, sesionesHechas: 6, sesionesPlan: 9, minutosCardio: 0 });
  });

  it('un programa terminó cuando no tiene semana actual o pasó su fecha final', () => {
    expect(hasEnded({ estado: 'ACTIVE', semanaActual: null, fechaFinPrevista: '2026-12-01' }, '2026-12-05')).toBe(true);
    expect(hasEnded({ estado: 'ACTIVE', semanaActual: 12, fechaFinPrevista: '2026-12-01' }, '2026-12-05')).toBe(true);
    expect(hasEnded({ estado: 'ACTIVE', semanaActual: 3, fechaFinPrevista: '2026-12-31' }, '2026-12-05')).toBe(false);
    expect(hasEnded({ estado: 'FINISHED', semanaActual: null, fechaFinPrevista: '2026-12-01' }, '2026-12-05')).toBe(false);
  });

  it('mide el avance hacia la meta entre la marca inicial y la meta', () => {
    expect(goalProgress({ marcaInicialKg: 100, marcaActualKg: 110, marcaMetaKg: 120 })).toBe(0.5);
    expect(goalProgress({ marcaInicialKg: 100, marcaActualKg: null, marcaMetaKg: 120 })).toBe(0);
    expect(goalProgress({ marcaInicialKg: 100, marcaActualKg: 130, marcaMetaKg: 120 })).toBe(1);
    expect(goalProgress({ marcaInicialKg: null, marcaActualKg: 10, marcaMetaKg: 120 })).toBe(0);
  });
});
