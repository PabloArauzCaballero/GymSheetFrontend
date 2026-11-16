import { ApiError, isLegalAcceptanceRequired, type ApiErrorKind } from '@gymsheet/api-client';

/** Answers a retry cannot change: an expired session, a denied permission, a missing resource. */
const NON_RETRYABLE: ReadonlySet<ApiErrorKind> = new Set<ApiErrorKind>([
  'unauthorized',
  'forbidden',
  'not-found',
  'validation',
]);

/**
 * TanStack `retry` of every query: once, for transient failures only. A legal
 * block (428) only lifts after accepting the current documents in the legal gate.
 */
export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (isLegalAcceptanceRequired(error)) return false;
  if (error instanceof ApiError && NON_RETRYABLE.has(error.kind)) return false;
  return failureCount < 1;
}
