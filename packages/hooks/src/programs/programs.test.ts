import { describe, expect, it } from 'vitest';
import type { Routine } from '@gymsheet/types';
import {
  buildActivateInput, buildCardioPlan, buildCardioSet, cardioProgressLabel, defaultCardioForm, describeProposal,
  emptyLiftForm, epley, estimateFromForm, formatClock, formatKg, hasErrors, isoWeekday, mainLifts, maxHeartRate,
  multiplierLabel, nextSession, realisticGoalRange, targetMinutesForWeek, validateCardio, validateLifts, weekLabel,
  zoneBounds, zoneOfHeartRate, zoneOfRpe,
} from './index';

const ex = (id: string, nombre: string) => ({ id: `re-${id}`, ejercicio: { id, nombre } }) as never;
const routine = {
  dias: [
    { id: 'd1', diaSemana: 1, nombre: 'Empuje', orden: 1, ejercicios: [ex('bench', 'Press banca'), ex('fly', 'Aperturas')] },
    { id: 'd2', diaSemana: 3, nombre: 'Pierna', orden: 2, ejercicios: [ex('squat', 'Sentadilla')] },
    { id: 'd3', diaSemana: 5, nombre: 'Empuje 2', orden: 3, ejercicios: [ex('bench', 'Press banca')] },
  ],
  ejercicios: [ex('bench', 'Press banca'), ex('squat', 'Sentadilla')],
} as unknown as Routine;

describe('metas de marca (RF-16)', () => {
  it('estima el 1RM con Epley: 100 kg × 5 = 116,7 kg', () => {
    expect(Math.round(epley(100, 5) * 10) / 10).toBe(116.7);
    expect(formatKg(epley(100, 5))).toBe('116,7 kg');
    expect(epley(100, 1)).toBe(100);
    expect(epley(0, 5)).toBe(0);
  });
  it('sugiere una meta realista de +5 a +10 %', () => {
    expect(realisticGoalRange(116.7)).toEqual({ minKg: 122.5, maxKg: 128.75 });
    expect(realisticGoalRange(100, true).maxKg).toBe(115);
  });
  it('valida marca, meta y fecha', () => {
    const form = { ...emptyLiftForm('bench', 'Press banca'), marcaPeso: '100', marcaReps: '5', meta: '125', fechaMeta: '2027-01-01' };
    expect(hasErrors(validateLifts('STRENGTH_GOALS', [form], '2026-10-09'))).toBe(false);
    expect(validateLifts('STRENGTH_GOALS', [{ ...form, meta: '110' }], '2026-10-09')[0]?.meta).toMatch(/superar/);
    expect(validateLifts('STRENGTH_GOALS', [{ ...form, marcaPeso: '' }], '2026-10-09')[0]?.marca).toBeDefined();
    expect(validateLifts('STRENGTH_GOALS', [{ ...form, fechaMeta: '2026-01-01' }], '2026-10-09')[0]?.fechaMeta).toMatch(/pasado/);
    expect(estimateFromForm(form)).toBeCloseTo(116.67, 1);
  });
  it('la sobrecarga solo exige un peso válido si se escribe', () => {
    const form = emptyLiftForm('bench', 'Press banca');
    expect(hasErrors(validateLifts('PROGRESSIVE_OVERLOAD', [form], '2026-10-09'))).toBe(false);
    expect(validateLifts('PROGRESSIVE_OVERLOAD', [{ ...form, pesoTrabajo: 'abc' }], '2026-10-09')[0]?.pesoTrabajo).toBeDefined();
  });
});

describe('cuerpo de la activación', () => {
  it('NONE no manda levantamientos', () => {
    expect(buildActivateInput({ routineId: 'r', mode: 'NONE', forms: [] })).toEqual({ routineId: 'r', modo: 'NONE' });
  });
  it('sobrecarga: peso, reps y RIR; reemplazo y días ordenados', () => {
    const form = { ...emptyLiftForm('bench', 'Press banca'), pesoTrabajo: '60,5' };
    expect(buildActivateInput({ routineId: 'r', mode: 'PROGRESSIVE_OVERLOAD', forms: [form], replace: true, diasSemana: [5, 1] })).toEqual({
      routineId: 'r', modo: 'PROGRESSIVE_OVERLOAD', replace: true, diasSemana: [1, 5],
      liftTargets: [{ ejercicioId: 'bench', pesoTrabajoKg: 60.5, repsMin: 8, repsMax: 12, rirObjetivo: 2 }],
    });
  });
  it('metas: marca actual, meta y fecha; omite los incompletos', () => {
    const ok = { ...emptyLiftForm('bench', 'x'), marcaPeso: '100', marcaReps: '5', meta: '125', fechaMeta: '2027-01-01' };
    const body = buildActivateInput({ routineId: 'r', mode: 'STRENGTH_GOALS', forms: [ok, emptyLiftForm('squat', 'y')] });
    expect(body.liftTargets).toHaveLength(1);
    expect(body.liftTargets?.[0]).toMatchObject({ ejercicioId: 'bench', marcaMetaKg: 125, fechaMeta: '2027-01-01', marcaActual: { pesoKg: 100, reps: 5 } });
  });
});

describe('tarjeta del programa', () => {
  it('elige el primer ejercicio de cada día sin repetir', () => {
    expect(mainLifts(routine).map((l) => l.ejercicioId)).toEqual(['bench', 'squat']);
  });
  it('texto de semana y multiplicador', () => {
    expect(multiplierLabel(1.4)).toBe('x1,4');
    expect(weekLabel({ semanaActual: 3, semanasTotales: 12, multiplicador: 1.4 })).toBe('Semana 3 de 12 · x1,4');
    expect(weekLabel({ semanaActual: 1, semanasTotales: 9, multiplicador: 1 })).toBe('Semana 1 de 9');
  });
  it('próxima sesión: hoy, siguiente día o la vuelta de la semana', () => {
    expect(nextSession(routine, 1)).toMatchObject({ dia: 1, esHoy: true, nombre: 'Empuje' });
    expect(nextSession(routine, 2)).toMatchObject({ dia: 3, esHoy: false });
    expect(nextSession(routine, 6)).toMatchObject({ dia: 1, esHoy: false });
    expect(nextSession({ dias: [{ id: 'x', diaSemana: null, nombre: null, orden: 1, ejercicios: [] }] }, 2)).toBeNull();
  });
  it('lunes = 1 y domingo = 7', () => {
    expect(isoWeekday(new Date(2026, 9, 5))).toBe(1);
    expect(isoWeekday(new Date(2026, 9, 11))).toBe(7);
  });
});

describe('propuesta RF-20', () => {
  it('describe cambios, altas y bajas', () => {
    const lines = describeProposal(
      { cambios: [{ routineExerciseId: 're-bench', pesoObjetivoKg: 62.5, seriesObjetivo: 4 }], agregar: [{ ejercicioId: 'x', seriesObjetivo: 3, pesoObjetivoKg: 20 }], quitar: ['re-squat'] },
      routine,
    );
    expect(lines).toEqual(['Press banca: peso a 62,5 kg y 4 series', 'Se añade un ejercicio nuevo: 3 series con 20 kg', 'Se quita Sentadilla']);
  });
});

describe('cardio (RF-17)', () => {
  it('FC máxima de Tanaka y zonas con Karvonen', () => {
    expect(maxHeartRate(30)).toBe(187);
    expect(zoneBounds(2, 190, 60)).toEqual({ minBpm: 138, maxBpm: 151 });
    expect(zoneBounds(2, 190)).toEqual({ minBpm: 114, maxBpm: 133 });
    expect(zoneOfHeartRate(140, 190, 60)).toBe(2);
    expect(zoneOfHeartRate(80, 190, 60)).toBe(0);
    expect(zoneOfRpe(4)).toBe(2);
    expect(zoneOfRpe(1)).toBe(1);
  });
  it('minutos objetivo crecen con la progresión y topan en 300', () => {
    expect(targetMinutesForWeek(30, 5, 1)).toBe(30);
    expect(targetMinutesForWeek(30, 5, 3)).toBe(34);
    expect(targetMinutesForWeek(290, 10, 5)).toBe(300);
  });
  it('cronómetro y progreso semanal', () => {
    expect(formatClock(65)).toBe('01:05');
    expect(formatClock(3725)).toBe('1:02:05');
    expect(cardioProgressLabel({ minutosSemana: 96, objetivoMinutosSemana: 90 })).toBe('96 / 90 min');
  });
  it('valida y arma el plan', () => {
    expect(validateCardio({ ...defaultCardioForm, dias: [] }).dias).toBeDefined();
    expect(validateCardio({ ...defaultCardioForm, dias: [1], minutos: '2' }).minutos).toBeDefined();
    expect(validateCardio({ ...defaultCardioForm, dias: [1], fcMax: '90' }).fcMax).toBeDefined();
    const plan = buildCardioPlan({ ...defaultCardioForm, dias: [5, 1, 3], fcReposo: '60', fcMax: '190' });
    expect(plan).toMatchObject({ modalidad: 'BICI', diasSemana: [1, 3, 5], minutosObjetivo: 30, fcReposo: 60, fcMax: 190, intensidad: { tipo: 'ZONA_FC', zona: 2 } });
    expect(buildCardioPlan({ ...defaultCardioForm, dias: [1], modoIntensidad: 'RPE', rpe: 6 }).intensidad).toEqual({ tipo: 'RPE', rpe: 6 });
  });
  it('la serie de cardio manda duración y opcionales; sin pulsómetro funciona igual', () => {
    expect(buildCardioSet({ numeroSerie: 1, segundos: 1920, distanciaKm: '10,5', fcMedia: '142', esfuerzo: 4 })).toEqual({
      tipoSerie: 'CARDIO', numeroSerie: 1, duracionSeg: 1920, distanciaM: 10500, fcMedia: 142, rpe: 4, descansoSegAnterior: 0,
    });
    expect(buildCardioSet({ numeroSerie: 2, segundos: 600, distanciaKm: '', fcMedia: '', esfuerzo: null })).toEqual({
      tipoSerie: 'CARDIO', numeroSerie: 2, duracionSeg: 600, descansoSegAnterior: 0,
    });
  });
});
