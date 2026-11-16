import { accountClosureCopy, emailChangeCopy } from '@gymsheet/domain';
import { ApiError } from '@/shared/api/api-error';
import { pinErrorMessage } from '@/features/account-security/lib/pin-errors';

const lookup = (table: Readonly<Record<string, string>>, code: string | undefined) =>
  code && Object.hasOwn(table, code) ? table[code] : undefined;

/** What a failed email change says: its code first, a PIN failure next, the server text last. */
export function emailChangeErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return pinErrorMessage(error);
  const known = lookup(emailChangeCopy.errors, error.code);
  if (known) return known;
  if (error.code?.startsWith('EMAIL_PIN_')) return pinErrorMessage(error);
  // The address was taken between the request and the PIN (409 without a code).
  if (error.status === 409) return emailChangeCopy.errors.taken;
  return error.message;
}

/** What a failed closure says. */
export function closureErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return 'No pudimos cerrar tu cuenta. Inténtalo de nuevo.';
  const known = lookup(accountClosureCopy.errors, error.code);
  if (known) return known;
  if (error.code?.startsWith('EMAIL_PIN_')) return pinErrorMessage(error);
  return error.message;
}
