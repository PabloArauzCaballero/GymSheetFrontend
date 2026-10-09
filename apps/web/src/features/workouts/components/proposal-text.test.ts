import { describe, expect, it } from 'vitest';
import { describeProposal } from './proposal-text';

describe('lista de cambios de la rutina (RF-20)', () => {
  const names = new Map([
    ['re1', 'Press banca'],
    ['ex9', 'Fondos'],
    ['re2', 'Aperturas'],
  ]);

  it('dice peso, series, altas y bajas con el nombre del ejercicio', () => {
    const lines = describeProposal(
      {
        cambios: [{ routineExerciseId: 're1', pesoObjetivoKg: 62.5, seriesObjetivo: 4 }],
        agregar: [{ ejercicioId: 'ex9', seriesObjetivo: 3, pesoObjetivoKg: 20 }],
        quitar: ['re2'],
      },
      names,
    );
    expect(lines).toEqual([
      'Press banca: peso 62,5 kg y 4 series',
      'Se añade Fondos (3 series con 20 kg)',
      'Se quita Aperturas',
    ]);
  });

  it('sin nombres conocidos no inventa ninguno', () => {
    expect(describeProposal({ cambios: [{ routineExerciseId: 'x', seriesObjetivo: 1 }], agregar: [], quitar: [] })).toEqual([
      'un ejercicio: 1 serie',
    ]);
  });
});
