import { describe, expect, it } from 'vitest';
import {
  MIN_AGE,
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
    expect(isoYearsAgo(18, new Date(2026, 8, 5))).toBe('2008-09-05');
  });

  it('accepts an empty value and rejects ages outside 18 to 100', () => {
    expect(birthDateInputSchema.safeParse('').success).toBe(true);
    expect(birthDateInputSchema.safeParse(isoYearsAgo(30)).success).toBe(true);
    expect(birthDateInputSchema.safeParse(isoYearsAgo(5)).success).toBe(false);
    expect(birthDateInputSchema.safeParse(isoYearsAgo(12)).success).toBe(false);
    expect(birthDateInputSchema.safeParse(isoYearsAgo(120)).success).toBe(false);
  });

  it('sets the floor at exactly 18: one day short is rejected, the birthday is accepted', () => {
    const today = new Date();
    const eighteenthBirthday = isoYearsAgo(18, today);
    const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    const oneDayShort = isoYearsAgo(18, tomorrow);
    expect(MIN_AGE).toBe(18);
    expect(ageFromBirthDate(oneDayShort, today)).toBe(17);
    expect(birthDateInputSchema.safeParse(oneDayShort).success).toBe(false);
    expect(birthDateInputSchema.safeParse(eighteenthBirthday).success).toBe(true);
  });

  it('explains the age range in the validation message', () => {
    const result = birthDateInputSchema.safeParse(isoYearsAgo(17));
    expect(result.error?.issues[0]?.message).toBe('Debes tener entre 18 y 100 años.');
  });

  it('only clears a birth date that already existed', () => {
    expect(birthDatePayload('1996-03-15', false)).toEqual({ fechaNacimiento: '1996-03-15' });
    expect(birthDatePayload('', true)).toEqual({ fechaNacimiento: null });
    expect(birthDatePayload('', false)).toEqual({});
  });
});
