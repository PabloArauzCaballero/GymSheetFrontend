import { EMAIL_VERIFICATION_REQUIRED } from '@/shared/api/schemas';
import { ApiError } from '@/shared/api/api-error';

/** A social endpoint closed until the person verifies the account email (403). */
export function isEmailVerificationRequired(error: unknown): error is ApiError {
  return error instanceof ApiError && error.code === EMAIL_VERIFICATION_REQUIRED;
}
