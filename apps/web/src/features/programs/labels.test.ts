import { describe, expect, it } from 'vitest';
import { hasMultiplier, modeLabel, multiplierLabel, nextMultiplierHint, programFraction, weekLabel } from './labels';

describe('etiquetas de programas', () => {
  it('escribe el multiplicador con coma decimal', () => {
    expect(multiplierLabel(1)).toBe('x1,0');
    expect(multiplierLabel(1.4)).toBe('x1,4');
    expect(multiplierLabel(2)).toBe('x2,0');
  });

  it('nombra cada modo', () => {
    expect(modeLabel('NONE')).toBe('Normal');
    expect(modeLabel('PROGRESSIVE_OVERLOAD')).toBe('Sobrecarga progresiva');
    expect(modeLabel('STRENGTH_GOALS')).toBe('Metas de marca');
    expect(modeLabel('CARDIO')).toBe('Cardio');
  });

  it('solo los modos dan multiplicador', () => {
    expect(hasMultiplier({ modo: 'NONE' })).toBe(false);
    expect(hasMultiplier({ modo: 'STRENGTH_GOALS' })).toBe(true);
  });

  it('dice en qué semana va y cuánto avanzó', () => {
    expect(weekLabel({ semanaActual: 3, semanasTotales: 12 })).toBe('Semana 3 de 12');
    expect(weekLabel({ semanaActual: null, semanasTotales: 12 })).toBe('12 semanas');
    expect(programFraction({ semanaActual: 3, semanasTotales: 12 })).toBe(0.25);
    expect(programFraction({ semanaActual: null, semanasTotales: 12 })).toBe(0);
  });

  it('avisa qué falta para el siguiente multiplicador, y se calla en el tope', () => {
    expect(nextMultiplierHint({ multiplicador: 1.4, proximoMultiplicador: 1.6 })).toBe(
      'Cumple esta semana para llegar a x1,6.',
    );
    expect(nextMultiplierHint({ multiplicador: 2, proximoMultiplicador: 2 })).toMatch(/máximo/);
  });
});
