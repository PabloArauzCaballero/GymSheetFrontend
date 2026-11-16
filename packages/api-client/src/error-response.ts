import { LEGAL_ACCEPTANCE_REQUIRED, problemSchema } from '@gymsheet/schemas';
import { ApiError, classifyStatus } from './api-error';

const FALLBACK_MESSAGE = 'La operación no pudo completarse.';

/** First message per field of the backend's flattened Zod issues (`issues.fieldErrors`). */
function firstFieldErrors(raw: Record<string, string[] | undefined> | undefined): Record<string, string> {
  const first: Record<string, string> = {};
  for (const [field, messages] of Object.entries(raw ?? {})) {
    if (messages?.[0]) first[field] = messages[0];
  }
  return first;
}

/**
 * The ApiError of a failed response, from the backend's problem body (which the
 * web BFF relays unchanged). The single parser every client uses, so a code,
 * its details and the per-field messages of a 400 never get lost on one of them.
 */
export function apiErrorFromProblem(status: number, payload: unknown): ApiError {
  const parsed = problemSchema.safeParse(payload);
  const problem = parsed.success ? parsed.data : null;
  return new ApiError({
    message: problem?.detail ?? problem?.error?.message ?? problem?.title ?? FALLBACK_MESSAGE,
    status,
    kind: classifyStatus(status),
    ...(problem?.requestId ? { requestId: problem.requestId } : {}),
    ...(problem?.code ? { code: problem.code } : {}),
    ...(problem?.details ? { details: problem.details } : {}),
    fieldErrors: firstFieldErrors(problem?.issues?.fieldErrors),
  });
}

export async function apiErrorFromResponse(response: Response): Promise<ApiError> {
  const payload: unknown = await response.json().catch(() => null);
  return apiErrorFromProblem(response.status, payload);
}

/**
 * A request blocked until the person accepts the current legal documents. The
 * one predicate behind the legal gate, the query-error policy, retries and the
 * toast engine: the blocking screen explains it, so nothing else should.
 */
export function isLegalAcceptanceRequired(error: unknown): error is ApiError {
  return (
    error instanceof ApiError && (error.code === LEGAL_ACCEPTANCE_REQUIRED || error.status === 428)
  );
}

/** Server messages for the given form fields, in the order of `fields`; empty for any other error. */
export function fieldErrorEntries<F extends string>(
  error: unknown,
  fields: readonly F[],
): Array<[F, string]> {
  if (!(error instanceof ApiError)) return [];
  return fields.flatMap((field) => {
    const message = error.fieldErrors[field];
    return message ? [[field, message] as [F, string]] : [];
  });
}
