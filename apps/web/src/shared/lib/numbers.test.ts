import { describe, expect, it } from 'vitest';
import { formatMultiplier, formatNumber } from './numbers';

describe('formatNumber', () => {
  it('formats values using the Bolivia locale', () => {
    expect(formatNumber(72.5)).toMatch(/72[,.]5/u);
  });

  it('uses an em dash for missing values', () => {
    expect(formatNumber(null)).toBe('—');
    expect(formatNumber(undefined)).toBe('—');
  });
});

describe('formatMultiplier', () => {
  it('usa coma decimal y dos decimales, sin puntos', () => {
    expect(formatMultiplier(1.2)).toBe('×1,20');
    expect(formatMultiplier(1)).toBe('×1,00');
    expect(formatMultiplier(null)).toBe('—');
  });
});
