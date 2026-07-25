import { describe, expect, it } from 'vitest';
import { formatNumber } from './numbers';

describe('formatNumber', () => {
  it('formats values using the Bolivia locale', () => {
    expect(formatNumber(72.5)).toMatch(/72[,.]5/u);
  });

  it('uses an em dash for missing values', () => {
    expect(formatNumber(null)).toBe('—');
    expect(formatNumber(undefined)).toBe('—');
  });
});
