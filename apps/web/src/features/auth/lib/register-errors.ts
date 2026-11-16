import type { RegisterInput } from '@/shared/api/schemas';
import { AuthRequestError } from '@/features/auth/services/auth-client';

/** Fields of the form a server 400 can point at (`issues.fieldErrors` keys). */
const formFields = [
  'nombreCompleto',
  'email',
  'password',
  'fechaNacimiento',
  'genero',
  'acceptedTerms',
] as const satisfies readonly (keyof RegisterInput)[];

type FormField = (typeof formFields)[number];

/** Server messages that belong next to a field of the signup form, in form order. */
export function registerFieldErrors(error: unknown): Array<[FormField, string]> {
  if (!(error instanceof AuthRequestError)) return [];
  return formFields.flatMap((field) => {
    const message = error.fieldErrors[field];
    return message ? [[field, message] as [FormField, string]] : [];
  });
}
