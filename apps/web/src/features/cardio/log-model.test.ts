import { describe, expect, it } from 'vitest';
import { formatClock, toCardioSet, validateLog } from './log-model';

describe('registro de una sesión de cardio', () => {
  it('pide solo los minutos; lo demás es opcional', () => {
    expect(validateLog({ minutos: '', distanciaKm: '', fcMedia: '', rpe: '' }).minutos).toBeTruthy();
    expect(validateLog({ minutos: '32', distanciaKm: '', fcMedia: '', rpe: '' })).toEqual({});
  });

  it('rechaza pulso, esfuerzo y distancia fuera de rango', () => {
    const errors = validateLog({ minutos: '30', distanciaKm: '-1', fcMedia: '10', rpe: '11' });
    expect(Object.keys(errors).sort()).toEqual(['distanciaKm', 'fcMedia', 'rpe']);
  });

  it('arma la serie CARDIO en segundos y metros, sin campos vacíos', () => {
    expect(toCardioSet({ minutos: '32', distanciaKm: '8,4', fcMedia: '142', rpe: '4' })).toEqual({
      tipoSerie: 'CARDIO',
      numeroSerie: 1,
      duracionSeg: 1920,
      distanciaM: 8400,
      fcMedia: 142,
      rpe: 4,
      descansoSegAnterior: 0,
    });
    const minimal = toCardioSet({ minutos: '10', distanciaKm: '', fcMedia: '', rpe: '' });
    expect(minimal).not.toHaveProperty('distanciaM');
    expect(minimal).not.toHaveProperty('fcMedia');
    expect(minimal).not.toHaveProperty('rpe');
  });

  it('escribe el cronómetro con ceros', () => {
    expect(formatClock(125)).toBe('02:05');
    expect(formatClock(3725)).toBe('1:02:05');
    expect(formatClock(-3)).toBe('00:00');
  });
});
