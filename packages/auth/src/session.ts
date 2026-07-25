import type { SessionPrincipal, UserRole } from '@gymsheet/types';

export type SessionStatus = 'loading' | 'authenticated' | 'unauthenticated';

export type SessionState =
  | { status: 'loading'; principal: null }
  | { status: 'authenticated'; principal: SessionPrincipal }
  | { status: 'unauthenticated'; principal: null };

export const initialSessionState: SessionState = { status: 'loading', principal: null };

export function isAuthenticated(state: SessionState): state is {
  status: 'authenticated';
  principal: SessionPrincipal;
} {
  return state.status === 'authenticated';
}

/** UI guard: does the current session satisfy the required roles (if any)? */
export function sessionAllows(
  state: SessionState,
  requiredRoles?: readonly UserRole[],
): boolean {
  if (state.status !== 'authenticated') return false;
  if (!requiredRoles || requiredRoles.length === 0) return true;
  return requiredRoles.includes(state.principal.role);
}
