import { emailVerificationCopy } from '@gymsheet/domain';
import { EMAIL_PIN_INVALID } from '@/shared/api/schemas';
import { ApiError } from '@/shared/api/api-error';

type PinErrorCode = keyof typeof emailVerificationCopy.errors;

const isPinErrorCode = (code: string | undefined): code is PinErrorCode =>
  typeof code === 'string' && Object.hasOwn(emailVerificationCopy.errors, code);

/** Shared copy per `EMAIL_PIN_*` code; a wrong PIN also says how many tries are left. */
export function pinErrorMessage(error: unknown): string {
  if (error instanceof ApiError && isPinErrorCode(error.code)) {
    const message = emailVerificationCopy.errors[error.code];
    const left = (error.details as { attemptsRemaining?: unknown } | undefined)?.attemptsRemaining;
    if (error.code !== EMAIL_PIN_INVALID || typeof left !== 'number') return message;
    return `${message} Te ${left === 1 ? 'queda 1 intento' : `quedan ${left} intentos`}.`;
  }
  return error instanceof ApiError && error.message
    ? error.message
    : 'No pudimos verificar el código.';
}

/** Codes after which the current PIN is useless: the only way on is a new one. */
export function needsNewPin(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.code === 'EMAIL_PIN_EXPIRED' || error.code === 'EMAIL_PIN_EXHAUSTED')
  );
}
