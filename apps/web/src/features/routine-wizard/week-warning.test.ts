import { describe, expect, it } from 'vitest';
import { weekAdjustmentWarning } from './week-warning';

describe('weekAdjustmentWarning', () => {
  it('singular', () => {
    expect(weekAdjustmentWarning([6])).toBe(
      'Rutina guardada. El ajuste de la semana 6 no se pudo aplicar; ábrela y vuelve a editarlo.',
    );
  });
  it('plural con «y»', () => {
    expect(weekAdjustmentWarning([2, 4, 6])).toContain('las semanas 2, 4 y 6 no se pudieron aplicar');
  });
});
