import { describe, expect, it } from 'vitest';
import {
  buildCardioPlan,
  defaultCardioDraft,
  hasCardioErrors,
  maxHeartRate,
  sessionMinutesForWeek,
  validateCardio,
  weightsAdvice,
  zoneBounds,
  zoneOfRpe,
} from './cardio-model';

describe('cálculos de cardio que se muestran', () => {
  it('estima la FC máxima con Tanaka', () => {
    expect(maxHeartRate(30)).toBe(187);
    expect(maxHeartRate(40)).toBe(180);
  });

  it('calcula las zonas con Karvonen y, sin pulso en reposo, con % de la máxima', () => {
    expect(zoneBounds(2, 180, 60)).toEqual({ min: 132, max: 144 });
    expect(zoneBounds(2, 180, null)).toEqual({ min: 108, max: 126 });
    expect(zoneBounds(9, 180, 60)).toEqual(zoneBounds(5, 180, 60));
  });

  it('traduce el esfuerzo percibido a zona', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(zoneOfRpe)).toEqual([1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
  });

  it('sube los minutos por semana sin pasar de 300 ni de 10 %', () => {
    expect(sessionMinutesForWeek(30, 5, 1)).toBe(30);
    expect(sessionMinutesForWeek(30, 5, 2)).toBe(32);
    expect(sessionMinutesForWeek(100, 10, 2)).toBe(110);
    expect(sessionMinutesForWeek(100, 50, 2)).toBe(110);
    expect(sessionMinutesForWeek(290, 10, 5)).toBe(300);
  });

  it('valida el plan y arma el cuerpo', () => {
    expect(hasCardioErrors(validateCardio(defaultCardioDraft))).toBe(false);
    expect(validateCardio({ ...defaultCardioDraft, dias: [] }).dias).toBeTruthy();
    expect(validateCardio({ ...defaultCardioDraft, minutos: '2' }).minutos).toBeTruthy();
    expect(validateCardio({ ...defaultCardioDraft, fcReposo: '20' }).fcReposo).toBeTruthy();
    expect(validateCardio({ ...defaultCardioDraft, intervalos: true, rondas: '' }).intervalos).toBeTruthy();
    const plan = buildCardioPlan({ ...defaultCardioDraft, fcReposo: '60', tipo: 'RPE', rpe: 5 }, 'Bici');
    expect(plan).toMatchObject({ modalidad: 'BICI', diasSemana: [1, 3, 5], minutosObjetivo: 30, fcReposo: 60, intensidad: { tipo: 'RPE', rpe: 5 }, intervalos: null });
  });

  it('avisa del orden cuando un día lleva pesas y cardio', () => {
    expect(weightsAdvice([1, 3], [1, 2])).toMatch(/primero las pesas/);
    expect(weightsAdvice([1, 3], [2, 4])).toBeNull();
  });
});
