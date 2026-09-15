import { describe, expect, it } from 'vitest';
import {
  ageFromBirthDate,
  birthDateInputSchema,
  birthDatePayload,
  isoYearsAgo,
} from './birth-date';

describe('birth date helpers', () => {
  it('counts a birthday that has not happened yet this year', () => {
    const today = new Date(2026, 8, 15);
    expect(ageFromBirthDate('1996-09-16', today)).toBe(29);
    expect(ageFromBirthDate('1996-09-15', today)).toBe(30);
  });

  it('computes date-input bounds relative to today', () => {
    expect(isoYearsAgo(12, new Date(2026, 8, 5))).toBe('2014-09-05');
  });

  it('accepts an empty value and rejects ages outside 12 to 100', () => {
    expect(birthDateInputSchema.safeParse('').success).toBe(true);
    expect(birthDateInputSchema.safeParse(isoYearsAgo(30)).success).toBe(true);
    expect(birthDateInputSchema.safeParse(isoYearsAgo(5)).success).toBe(false);
    expect(birthDateInputSchema.safeParse(isoYearsAgo(120)).success).toBe(false);
  });

  it('only clears a birth date that already existed', () => {
    expect(birthDatePayload('1996-03-15', false)).toEqual({ fechaNacimiento: '1996-03-15' });
    expect(birthDatePayload('', true)).toEqual({ fechaNacimiento: null });
    expect(birthDatePayload('', false)).toEqual({});
  });
});
