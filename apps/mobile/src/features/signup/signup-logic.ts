import { authCopy } from '@gymsheet/domain';
import { toIsoBirthDate, type BirthDateParts } from '../../lib/birth-date';

/** Signup field copy, from the shared `authCopy` so web and mobile say the same. */
export const signupCopy = {
  birthDate: authCopy.fields.birthDate,
  sex: { label: authCopy.fields.gender.label },
} as const;

/**
 * What the form stores for a day/month/year triple: `''` while untouched (so
 * the schema says «Indica tu fecha de nacimiento.»), otherwise `YYYY-MM-DD`,
 * which the shared schema validates (real date, 18–100).
 */
export function birthDateFromParts(parts: BirthDateParts): string {
  if (parts.dia === '' && parts.mes === '' && parts.anio === '') return '';
  return toIsoBirthDate(parts);
}
