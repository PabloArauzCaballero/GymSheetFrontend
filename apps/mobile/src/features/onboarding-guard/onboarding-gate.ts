import type { UserRole } from '@gymsheet/types';

/** Route of the onboarding questionnaire inside the private group. */
export const ONBOARDING_PATH = '/onboarding';

/** Query key shared by the guard and the onboarding screen, scoped per account. */
export function onboardingQueryKey(userId: string | null | undefined) {
  return ['onboarding', 'me', userId ?? null] as const;
}

export type OnboardingStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'REQUIRES_UPDATE';

export type OnboardingGateInput = {
  role: UserRole | null | undefined;
  pathname: string;
  /** Last known onboarding status, `undefined` until the first answer lands. */
  status: OnboardingStatus | undefined;
  /** The fetch failed and there is no previous answer to fall back on. */
  failed: boolean;
};

export type OnboardingGate =
  | { kind: 'pass' }
  | { kind: 'wait' }
  | { kind: 'error' }
  | { kind: 'redirect'; to: 'onboarding' | 'home' };

/**
 * Decides what the private area does with the current route, mirroring the web
 * `OnboardingGuard`: only a CLIENTE is held on `/onboarding` until the API says
 * COMPLETED; staff are never sent there. A failed check blocks with a retry
 * instead of redirecting, so a network error never pushes someone into (or out
 * of) the questionnaire by mistake.
 */
export function decideOnboardingGate({ role, pathname, status, failed }: OnboardingGateInput): OnboardingGate {
  const onOnboarding = pathname === ONBOARDING_PATH;
  if (role == null) return { kind: 'wait' };
  if (role !== 'CLIENTE') return onOnboarding ? { kind: 'redirect', to: 'home' } : { kind: 'pass' };
  if (status === undefined) return failed ? { kind: 'error' } : { kind: 'wait' };
  if (status !== 'COMPLETED') return onOnboarding ? { kind: 'pass' } : { kind: 'redirect', to: 'onboarding' };
  return onOnboarding ? { kind: 'redirect', to: 'home' } : { kind: 'pass' };
}
