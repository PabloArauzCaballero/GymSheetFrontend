import { ApiError } from '@gymsheet/api-client';
import { emailVerificationCopy, pinCooldownSeconds } from '@gymsheet/domain';
import { EMAIL_PIN_COOLDOWN, EMAIL_VERIFICATION_REQUIRED } from '@gymsheet/schemas';

/** Pure rules of the email verification flow (no React Native: runs under `node --test`). */

export const PIN_LENGTH = 6;

/**
 * Default wait after a successful resend. Mirrors the server's resend cooldown;
 * if the server disagrees, its 429 carries the real figure and wins.
 */
export const RESEND_COOLDOWN_SECONDS = 60;

/** Keeps digits only, at most six: pasted «123 456» or «Código: 123456» still work. */
export function sanitizePin(text: string): string {
  return text.replace(/\D/gu, '').slice(0, PIN_LENGTH);
}

type PinErrorCode = keyof typeof emailVerificationCopy.errors;

function isPinErrorCode(code: string | undefined): code is PinErrorCode {
  return code !== undefined && code in emailVerificationCopy.errors;
}

/** The sentence for a failed request or confirmation; `null` when it is not a PIN error. */
export function pinErrorMessage(error: unknown): string | null {
  if (!(error instanceof ApiError)) return null;
  return isPinErrorCode(error.code) ? emailVerificationCopy.errors[error.code] : null;
}

/** Seconds to wait from a 429 EMAIL_PIN_COOLDOWN; `null` for any other error. */
export function cooldownFromError(error: unknown): number | null {
  if (!(error instanceof ApiError) || error.code !== EMAIL_PIN_COOLDOWN) return null;
  return pinCooldownSeconds(error.details) ?? RESEND_COOLDOWN_SECONDS;
}

/** The PIN is spent (expired or too many tries): only a new code helps, so the field clears. */
export function needsNewPin(error: unknown): boolean {
  return error instanceof ApiError && (error.code === 'EMAIL_PIN_EXPIRED' || error.code === 'EMAIL_PIN_EXHAUSTED');
}

/** A social endpoint closed because the mailbox is not proven yet. */
export function isEmailVerificationRequired(error: unknown): boolean {
  return error instanceof ApiError && error.code === EMAIL_VERIFICATION_REQUIRED;
}

/** Same test on a raw response, for the transport layer (before an ApiError exists). */
export function isEmailVerificationResponse(status: number, body: unknown): boolean {
  return status === 403 && (body as { code?: unknown } | null)?.code === EMAIL_VERIFICATION_REQUIRED;
}
