import { ApiError, fieldErrorEntries } from '@gymsheet/api-client';
import { authCopy, authErrorMessage } from '@gymsheet/domain';
import { registerServerFields, type RegisterServerField } from '@gymsheet/schemas';
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

/**
 * Where a failed signup is shown: the server messages of a 400 go next to their
 * fields (`ApiError.fieldErrors`); only a failure no field explains becomes the banner.
 */
export function signupServerErrors(error: unknown): {
  fields: Array<[RegisterServerField, string]>;
  banner: string | null;
} {
  const fields = fieldErrorEntries(error, registerServerFields);
  if (fields.length > 0) return { fields, banner: null };
  const banner =
    error instanceof ApiError
      ? authErrorMessage(error.kind, 'register', error.message)
      : authErrorMessage(undefined, 'register');
  return { fields, banner };
}
