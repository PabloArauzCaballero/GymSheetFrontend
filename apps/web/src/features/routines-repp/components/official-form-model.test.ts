import { describe, expect, it } from 'vitest';
import { draftToInput, emptyDraft, validateDraft, type OfficialDraft } from './official-form-model';

const exercise = (key: string) => ({
  key,
  ejercicioId: '0190e2cb-a6d4-7ec3-8f91-a6c735631501',
  nombre: 'Sentadilla',
  series: 4,
  repsMin: 6,
  repsMax: 8,
});

const valid = (): OfficialDraft => ({
  nombre: ' Fuerza base ',
  descripcion: '  ',
  dias: [
    { key: 'a', diaSemana: 1, nombre: 'Pierna ', ejercicios: [exercise('x')] },
    { key: 'b', diaSemana: null, nombre: '', ejercicios: [exercise('y')] },
  ],
});

describe('formulario de rutina oficial', () => {
  it('acepta un borrador completo y lo convierte al contrato', () => {
    expect(validateDraft(valid())).toBeNull();
    expect(draftToInput(valid())).toEqual({
      nombre: 'Fuerza base',
      descripcion: null,
      dias: [
        {
          diaSemana: 1,
          nombre: 'Pierna',
          ejercicios: [
            { ejercicioId: '0190e2cb-a6d4-7ec3-8f91-a6c735631501', seriesObjetivo: 4, repsMin: 6, repsMax: 8 },
          ],
        },
        {
          diaSemana: null,
          nombre: null,
          ejercicios: [
            { ejercicioId: '0190e2cb-a6d4-7ec3-8f91-a6c735631501', seriesObjetivo: 4, repsMin: 6, repsMax: 8 },
          ],
        },
      ],
    });
  });

  it('rechaza lo que el backend rechazaría', () => {
    expect(validateDraft(emptyDraft())).toMatch(/nombre/u);
    expect(validateDraft({ ...valid(), dias: [] })).toMatch(/al menos un día/u);
    const repeated = valid();
    repeated.dias[1] = { ...repeated.dias[1]!, diaSemana: 1 };
    expect(validateDraft(repeated)).toMatch(/mismo día/u);
    const empty = valid();
    empty.dias[0] = { ...empty.dias[0]!, ejercicios: [] };
    expect(validateDraft(empty)).toMatch(/al menos un ejercicio/u);
    const reps = valid();
    reps.dias[0] = { ...reps.dias[0]!, ejercicios: [{ ...exercise('z'), repsMin: 10, repsMax: 5 }] };
    expect(validateDraft(reps)).toMatch(/repeticiones/u);
  });
});
