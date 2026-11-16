import { authCopy, signupRejectedMessage } from '@gymsheet/domain';
import { SIGNUP_MAX_AGE, SIGNUP_MIN_AGE } from '@/shared/api/schemas';

/** Signup field copy, from the shared `authCopy` so web and mobile say the same. */
export const signupCopy = {
  birthDate: authCopy.fields.birthDate,
  sex: { label: authCopy.fields.gender.label },
  /** `SIGNUP_REJECTED`: deliberately generic, never the reason. */
  rejected: signupRejectedMessage,
} as const;

function isoDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * `min`/`max` of the native date picker, so the calendar only offers ages in
 * range. Local calendar, like `ageOn`. The schema still validates typed input.
 */
export function birthDateBounds(today: Date = new Date()): { min: string; max: string } {
  const max = new Date(today.getFullYear() - SIGNUP_MIN_AGE, today.getMonth(), today.getDate());
  // Someone born exactly MAX + 1 years ago is already too old: the earliest date is the day after.
  const min = new Date(today.getFullYear() - SIGNUP_MAX_AGE - 1, today.getMonth(), today.getDate() + 1);
  return { min: isoDay(min), max: isoDay(max) };
}
