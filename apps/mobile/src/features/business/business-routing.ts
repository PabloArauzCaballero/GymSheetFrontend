import { accountKindOf, authDestination, businessDestination } from '@gymsheet/domain';
import type { SessionPrincipal } from '@gymsheet/types';

/**
 * Which shell a session mounts (ADR-0020): pure, so `node --test` covers it.
 * A business account never sees a person screen and a person never sees the
 * business shell; the API refuses both directions anyway (403).
 */
type Principal = Pick<SessionPrincipal, 'role' | 'accountKind'>;

/** Home of a signed-in account. */
export function homeFor(principal: Principal | null): string {
  return principal && accountKindOf(principal) === 'BUSINESS'
    ? businessDestination.mobile.home
    : authDestination.mobile.afterLogin;
}

/** Where the person group sends this session instead of rendering, or null to render. */
export function personShellRedirect(principal: Principal | null): string | null {
  return principal && accountKindOf(principal) === 'BUSINESS' ? businessDestination.mobile.home : null;
}

/** Where the business group sends this session instead of rendering, or null to render. */
export function businessShellRedirect(
  status: 'loading' | 'authenticated' | 'unauthenticated',
  principal: Principal | null,
): string | null {
  if (status === 'unauthenticated') return '/(auth)/login';
  if (status === 'authenticated' && principal && accountKindOf(principal) !== 'BUSINESS') {
    return authDestination.mobile.afterLogin;
  }
  return null;
}
