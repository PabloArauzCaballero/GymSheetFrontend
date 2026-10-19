import { describe, expect, it } from 'vitest';
import { routineWeekOverrideSchema } from '@gymsheet/schemas';

describe('routineWeekOverrideSchema', () => {
  it('acepta la respuesta del servidor con claves en inglés y la normaliza', () => {
    expect(
      routineWeekOverrideSchema.parse({ semana: 6, isDeload: true, volumeFactor: 0.6, loadFactor: 0.9, note: null }),
    ).toEqual({ semana: 6, esDescarga: true, factorVolumen: 0.6, factorCarga: 0.9, nota: null });
  });
  it('sigue aceptando el contrato en español', () => {
    expect(
      routineWeekOverrideSchema.parse({ semana: 4, esDescarga: false, factorVolumen: 1, factorCarga: 1 }),
    ).toMatchObject({ semana: 4, esDescarga: false, nota: null });
  });
});
