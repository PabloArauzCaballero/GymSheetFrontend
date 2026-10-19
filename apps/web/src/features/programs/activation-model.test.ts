import { describe, expect, it } from 'vitest';
import type { Routine } from '@gymsheet/types';
import {
  addDaysIso,
  buildActivationInput,
  createDraft,
  epley,
  hasErrors,
  isReliableEstimate,
  mainExercises,
  nextMondayIso,
  realisticGoalRange,
  validateDraft,
} from './activation-model';

const ex = (id: string, name: string, kg: number | null = null) => ({
  id: `re-${id}`,
  orden: 1,
  seriesObjetivo: 3,
  repsMin: 8,
  repsMax: 12,
  pesoObjetivoKg: kg,
  rirObjetivo: null,
  descansoSeg: null,
  nota: null,
  ejercicio: { id, nombre: name } as never,
});
const routine = {
  id: 'r1',
  duracionSemanas: 12,
  dias: [
    { id: 'd1', diaSemana: 1, nombre: 'Empuje', orden: 1, ejercicios: [ex('bench', 'Press banca', 60), ex('ohp', 'Press militar')] },
    { id: 'd2', diaSemana: 3, nombre: 'Pierna', orden: 2, ejercicios: [ex('squat', 'Sentadilla')] },
    { id: 'd3', diaSemana: 5, nombre: 'Empuje 2', orden: 3, ejercicios: [ex('bench', 'Press banca')] },
  ],
} as unknown as Routine;

describe('cálculos de la activación', () => {
  it('estima el 1RM con Epley y avisa cuando no es fiable', () => {
    expect(epley(100, 5)).toBe(116.7);
    expect(epley(60, 10)).toBe(80);
    expect(isReliableEstimate(10)).toBe(true);
    expect(isReliableEstimate(12)).toBe(false);
  });

  it('propone una meta realista de +5 a +10 %', () => {
    expect(realisticGoalRange(116.7)).toEqual({ min: 123, max: 128 });
  });

  it('calcula el próximo lunes sin repetir el de hoy', () => {
    expect(nextMondayIso(new Date(2026, 9, 8))).toBe('2026-10-12'); // jueves
    expect(nextMondayIso(new Date(2026, 9, 12))).toBe('2026-10-19'); // lunes
    expect(nextMondayIso(new Date(2026, 9, 11))).toBe('2026-10-12'); // domingo
    expect(addDaysIso('2026-10-08', 84)).toBe('2026-12-31');
  });

  it('toma como principales el primer ejercicio de cada día, sin repetir', () => {
    expect(mainExercises(routine).map((item) => item.ejercicioId)).toEqual(['bench', 'squat']);
  });

  it('arranca con los días y la duración de la rutina', () => {
    const draft = createDraft(routine, new Date(2026, 9, 8));
    expect(draft).toMatchObject({ semanas: '12', dias: [1, 3, 5], modo: 'NONE' });
    expect(draft.lifts[0]).toMatchObject({ pesoKg: '60', metaFecha: '2026-12-31' });
  });
});

describe('validación y cuerpo de la activación', () => {
  const base = createDraft(routine, new Date(2026, 9, 8));

  it('sin modo solo exige semanas y días', () => {
    expect(hasErrors(validateDraft(base))).toBe(false);
    expect(validateDraft({ ...base, dias: [] }).dias).toMatch(/al menos un día/);
    expect(validateDraft({ ...base, semanas: '60' }).semanas).toMatch(/1 y 52/);
  });

  it('sobrecarga pide un rango de repeticiones válido', () => {
    const draft = { ...base, modo: 'PROGRESSIVE_OVERLOAD' as const };
    expect(hasErrors(validateDraft(draft))).toBe(false);
    const broken = { ...draft, lifts: draft.lifts.map((lift) => ({ ...lift, repsMin: '12', repsMax: '8' })) };
    expect(validateDraft(broken).lift?.bench).toMatch(/repeticiones/);
  });

  it('metas pide marca actual y meta, y como máximo tres levantamientos', () => {
    const draft = { ...base, modo: 'STRENGTH_GOALS' as const };
    expect(validateDraft(draft).lift?.bench).toMatch(/marca actual/);
    const filled = {
      ...draft,
      lifts: draft.lifts.map((lift) => ({ ...lift, marcaPesoKg: '100', marcaReps: '5', metaKg: '125' })),
    };
    expect(hasErrors(validateDraft(filled))).toBe(false);
    const none = { ...filled, lifts: filled.lifts.map((lift) => ({ ...lift, incluir: false })) };
    expect(validateDraft(none).lifts).toMatch(/al menos un levantamiento/);
  });

  it('arma el cuerpo de sobrecarga con peso, reps y RIR', () => {
    const draft = { ...base, modo: 'PROGRESSIVE_OVERLOAD' as const };
    const body = buildActivationInput('r1', draft, { replace: true, now: new Date(2026, 9, 8) });
    expect(body).toMatchObject({
      routineId: 'r1',
      fechaInicio: '2026-10-08',
      duracionSemanas: 12,
      modo: 'PROGRESSIVE_OVERLOAD',
      diasSemana: [1, 3, 5],
      replace: true,
    });
    expect(body.liftTargets?.[0]).toEqual({ ejercicioId: 'bench', pesoTrabajoKg: 60, repsMin: 8, repsMax: 12, rirObjetivo: 2 });
  });

  it('arma el cuerpo de metas con marca actual y meta con fecha', () => {
    const draft = {
      ...base,
      modo: 'STRENGTH_GOALS' as const,
      inicio: 'lunes' as const,
      lifts: base.lifts.map((lift) => ({ ...lift, marcaPesoKg: '100', marcaReps: '5', metaKg: '125' })),
    };
    const body = buildActivationInput('r1', draft, { replace: false, now: new Date(2026, 9, 8) });
    expect(body.fechaInicio).toBe('2026-10-12');
    expect(body.liftTargets?.[0]).toMatchObject({
      marcaActual: { pesoKg: 100, reps: 5 },
      marcaMetaKg: 125,
      fechaMeta: '2026-12-31',
    });
  });

  it('sin modo no manda levantamientos', () => {
    expect(buildActivationInput('r1', base, { replace: false }).liftTargets).toBeUndefined();
  });
});
