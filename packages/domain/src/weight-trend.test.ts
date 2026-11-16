import { describe, expect, it } from 'vitest';
import { weightRowSubtitle, weightTrend } from './weight-trend';

const day = (value: string) => value.slice(5);

describe('weight trend', () => {
  it('a change that rounds to zero says «Sin cambios», never «−0 kg»', () => {
    expect(weightTrend(0, 'KG', '3 oct.')).toBe('Sin cambios desde 3 oct.');
    expect(weightTrend(-0.04, 'KG', '3 oct.')).toBe('Sin cambios desde 3 oct.');
    expect(weightTrend(0.04, 'KG', '3 oct.')).toBe('Sin cambios desde 3 oct.');
  });

  it('gains and losses carry their sign and one decimal', () => {
    expect(weightTrend(1.5, 'KG', '3 oct.')).toBe('+1,5 kg desde 3 oct.');
    expect(weightTrend(-2.26, 'KG', '3 oct.')).toBe('−2,3 kg desde 3 oct.');
  });

  it('the row subtitle reads the newest weigh-in whatever the input order', () => {
    const weighIns = [
      { id: 1, weight: 64, unit: 'KG', measuredOn: '2026-10-01' },
      { id: 2, weight: 62.5, unit: 'KG', measuredOn: '2026-11-15' },
    ];
    expect(weightRowSubtitle(weighIns, false, day)).toBe('Último: 62,5 kg · −1,5 kg desde 10-01');
    expect(weightRowSubtitle([...weighIns].reverse(), false, day)).toBe('Último: 62,5 kg · −1,5 kg desde 10-01');
  });

  it('one weigh-in has no trend; none asks for the first; a failure says so', () => {
    expect(weightRowSubtitle([{ id: 1, weight: 70, unit: 'KG', measuredOn: '2026-11-15' }], false, day)).toBe('Último: 70 kg');
    expect(weightRowSubtitle([], false, day)).toBe('Anota tu primer pesaje');
    expect(weightRowSubtitle(undefined, true, day)).toBe('No se pudo cargar tu evolución');
  });
});

describe('shortDate on calendar dates', () => {
  it('keeps the stored day whatever the time zone', async () => {
    const { shortDate } = await import('./session-labels');
    expect(shortDate(`${new Date().getFullYear()}-11-15`)).toMatch(/^15 nov/u);
  });
});
