import { registerServerFields, type RegisterServerField } from '@/shared/api/schemas';
import { fieldErrorEntries } from '@/shared/api/api-error';

/** Server messages (ApiError.fieldErrors of a 400) that belong next to a field of the signup form, in form order. */
export function registerFieldErrors(error: unknown): Array<[RegisterServerField, string]> {
  return fieldErrorEntries(error, registerServerFields);
}
