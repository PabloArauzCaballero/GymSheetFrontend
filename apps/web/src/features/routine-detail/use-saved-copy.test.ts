import { describe, expect, it } from 'vitest';
import { pickSavedCopy } from './use-saved-copy';

const source = { id: 'orig', nombre: 'Empuje' };

describe('pickSavedCopy', () => {
  it('toma la copia de numeroCopia más alto entre las basadas en la rutina', () => {
    const copy = pickSavedCopy(source, [
      { id: 'a', nombre: 'Empuje · v1', basadaEnRutinaId: 'orig', numeroCopia: 1 },
      { id: 'b', nombre: 'Otro nombre', basadaEnRutinaId: 'orig', numeroCopia: 2 },
      { id: 'c', nombre: 'Empuje · v9', basadaEnRutinaId: 'otra', numeroCopia: 9 },
    ]);
    expect(copy).toEqual({ id: 'b', label: 'Ya la guardaste como v2' });
  });

  it('no se fía del nombre cuando la tarjeta dice de qué rutina viene', () => {
    expect(
      pickSavedCopy(source, [{ id: 'c', nombre: 'Empuje · v3', basadaEnRutinaId: 'otra', numeroCopia: 3 }]),
    ).toBeNull();
  });

  it('respaldo: sin basadaEnRutinaId lee el sufijo «· vN» del nombre', () => {
    expect(pickSavedCopy(source, [{ id: 'd', nombre: 'Empuje · v4' }])?.label).toBe('Ya la guardaste como v4');
    expect(pickSavedCopy(source, [{ id: 'e', nombre: 'Empuje largo' }])).toBeNull();
  });
});
