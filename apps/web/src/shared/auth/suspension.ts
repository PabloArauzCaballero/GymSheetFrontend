import { accountSuspensionOf, type AccountSuspension } from '@gymsheet/domain';

/**
 * Carries a suspension from wherever it is detected (server session check,
 * a client request) to the login screen, which says it by its code. The
 * query value is `review` for a pending review, the end date otherwise.
 */
export const SUSPENDED_PARAM = 'suspended';

export function suspensionParam(suspension: AccountSuspension): string {
  if (suspension.pendingReview) return 'review';
  return suspension.until ?? 'yes';
}

export function suspensionFromParam(value: string | null | undefined): AccountSuspension | null {
  if (!value) return null;
  if (value === 'review') return { pendingReview: true, until: null };
  return { pendingReview: false, until: Number.isNaN(Date.parse(value)) ? null : value };
}

/** Clears the session cookie (BFF logout), then the login screen with the suspension. */
export function suspendedExitPath(suspension: AccountSuspension): string {
  const login = `/login?${SUSPENDED_PARAM}=${encodeURIComponent(suspensionParam(suspension))}`;
  return `/api/auth/logout?returnTo=${encodeURIComponent(login)}`;
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
