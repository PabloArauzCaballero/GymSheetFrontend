import { describe, expect, it } from 'vitest';
import {
  daysPerWeekLabel,
  durationLabel,
  exerciseCountLabel,
  goalLabel,
  ratingLabel,
  visibilityLabel,
} from './labels';

describe('etiquetas de rutinas', () => {
  it('expresa la duración en meses cuando son completos', () => {
    expect(durationLabel(12)).toBe('3 meses');
    expect(durationLabel(4)).toBe('1 mes');
    expect(durationLabel(6)).toBe('6 semanas');
    expect(durationLabel(1)).toBe('1 semana');
    expect(durationLabel(null)).toBeNull();
  });

  it('pluraliza los días y los ejercicios', () => {
    expect(daysPerWeekLabel(1)).toBe('1 día/sem');
    expect(daysPerWeekLabel(4)).toBe('4 días/sem');
    expect(exerciseCountLabel(1)).toBe('1 ejercicio');
    expect(exerciseCountLabel(5)).toBe('5 ejercicios');
    expect(exerciseCountLabel(null)).toMatch(/aceptar/);
  });

  it('nombra la valoración con coma decimal o dice que no hay', () => {
    expect(ratingLabel(4.6, 32)).toBe('4,6 (32)');
    expect(ratingLabel(null, 0)).toBe('Sin valoraciones');
  });

  it('nombra objetivo y visibilidad', () => {
    expect(goalLabel('HIPERTROFIA')).toBe('Hipertrofia');
    expect(goalLabel(null)).toBe('Objetivo libre');
    expect(visibilityLabel('PRIVATE')).toBe('Privada');
    expect(visibilityLabel('PUBLIC')).toBe('Pública');
  });
});
