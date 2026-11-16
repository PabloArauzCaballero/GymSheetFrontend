import {
  accountSuspensionOf,
  isSanctionReasonCode,
  sanctionReasonFromCode,
  type AccountSuspension,
} from '@gymsheet/domain';

/**
 * Carries a suspension from wherever it is detected (server session check,
 * a client request) to the login screen, which says it by its code. The
 * `suspended` value is `review` for a pending review, the end date otherwise;
 * `reason` is only the moderation reason CODE of a closed list. The reason's
 * words never travel in the URL: the login screen rebuilds them from the code,
 * and anything else in the query is ignored, never shown.
 */
export const SUSPENDED_PARAM = 'suspended';
export const REASON_PARAM = 'reason';

export function suspensionParam(suspension: AccountSuspension): string {
  if (suspension.pendingReview) return 'review';
  return suspension.until ?? 'yes';
}

type QueryReader = { get: (name: string) => string | null };

export function suspensionFromParams(query: QueryReader): AccountSuspension | null {
  const value = query.get(SUSPENDED_PARAM);
  if (!value) return null;
  const reason = sanctionReasonFromCode(query.get(REASON_PARAM));
  if (value === 'review') return { pendingReview: true, until: null, reason };
  return { pendingReview: false, until: Number.isNaN(Date.parse(value)) ? null : value, reason };
}

/** The login screen with the suspension and, when known, its reason code. */
export function suspendedLoginPath(suspension: AccountSuspension): string {
  const query = new URLSearchParams({ [SUSPENDED_PARAM]: suspensionParam(suspension) });
  const code = suspension.reason?.code;
  if (isSanctionReasonCode(code)) query.set(REASON_PARAM, code);
  return `/login?${query.toString()}`;
}

/** Clears the session cookie (BFF logout), then the login screen with the suspension. */
export function suspendedExitPath(suspension: AccountSuspension): string {
  return `/api/auth/logout?returnTo=${encodeURIComponent(suspendedLoginPath(suspension))}`;
}

let leaving = false;

/**
 * Leaves the portal when a client request reports a suspension (401
 * `ACCOUNT_SUSPENDED` mid-session). Returns whether it did. A full
 * navigation: nothing of the suspended session stays mounted or retries.
 */
export function leaveIfSuspended(
  error: unknown,
  navigate: (path: string) => void = (path) => window.location.assign(path),
): boolean {
  const suspension = accountSuspensionOf(error);
  if (!suspension) return false;
  // Several queries fail with the same 401 at once: navigate only once.
  if (!leaving) {
    leaving = true;
    navigate(suspendedExitPath(suspension));
  }
  return true;
}

/** Test seam: forget a previous exit. */
export function resetSuspensionExitForTests() {
  leaving = false;
}
