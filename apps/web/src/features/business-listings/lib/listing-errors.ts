import { ApiError } from '@gymsheet/api-client';
import { listingErrorMessage } from '@gymsheet/domain';

/** The Spanish text of a listings error: our copy for a known code, else the server's message. */
export function listingErrorText(error: unknown): string {
  if (error instanceof ApiError) return listingErrorMessage(error.code, error.message, error.details);
  return error instanceof Error ? error.message : 'Algo salió mal. Vuelve a intentarlo.';
}

export function isListingErrorCode(error: unknown, code: string): boolean {
  return error instanceof ApiError && error.code === code;
}
