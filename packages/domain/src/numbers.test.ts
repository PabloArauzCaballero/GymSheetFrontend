import { describe, expect, it } from 'vitest';
import { formatDecimalInput, parseDecimalInput } from './numbers';

describe('decimal form fields', () => {
  it('writes decimals with a comma', () => {
    expect(formatDecimalInput(63.5)).toBe('63,5');
    expect(formatDecimalInput(168)).toBe('168');
    expect(formatDecimalInput(null)).toBe('');
    expect(formatDecimalInput(Number.NaN)).toBe('');
  });

  it('reads either separator back to the same number', () => {
    expect(parseDecimalInput('63,5')).toBe(63.5);
    expect(parseDecimalInput(' 63.5 ')).toBe(63.5);
    expect(parseDecimalInput('70')).toBe(70);
  });

  it('turns empty or garbage into NaN so the schema rejects it', () => {
    expect(parseDecimalInput('')).toBeNaN();
    expect(parseDecimalInput('6,3,5')).toBeNaN();
    expect(parseDecimalInput('abc')).toBeNaN();
  });
});
