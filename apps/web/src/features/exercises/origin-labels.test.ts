import { describe, expect, it } from 'vitest';
import { exerciseOriginLabel, exerciseStatusLabel, exerciseTypeLabel } from './origin-labels';

describe('origin-labels', () => {
  it('no deja pasar códigos internos', () => {
    expect(exerciseTypeLabel('GLOBAL')).toBe('Del catálogo');
    expect(exerciseTypeLabel('PERSONAL')).toBe('Personal');
    expect(exerciseStatusLabel('ACTIVO')).toBe('Activo');
    expect(exerciseOriginLabel('EXERCISES_DATASET')).toBe('Base de datos pública de ejercicios');
    expect(exerciseOriginLabel('CUSTOM')).toBe('Creado en GymSheet');
    expect(exerciseOriginLabel(undefined)).toBeNull();
    expect(exerciseOriginLabel('OTRO')).toBeNull();
  });
});
