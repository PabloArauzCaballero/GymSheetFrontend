import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/shared/api/api-error';
import {
  leaveIfSuspended,
  resetSuspensionExitForTests,
  suspendedExitPath,
  suspensionFromParam,
  suspensionParam,
} from './suspension';

const suspended = new ApiError({
  message: 'Tu cuenta está suspendida mientras revisamos un reporte.',
  status: 401,
  kind: 'unauthorized',
  code: 'ACCOUNT_SUSPENDED',
  details: { pendingReview: true },
});

describe('suspension exit', () => {
  beforeEach(() => resetSuspensionExitForTests());

  it('clears the session through the BFF logout and lands on login with the suspension', () => {
    expect(suspendedExitPath({ pendingReview: true, until: null })).toBe(
      '/api/auth/logout?returnTo=%2Flogin%3Fsuspended%3Dreview',
    );
    const dated = { pendingReview: false, until: '2026-12-01T00:00:00.000Z' };
    expect(suspensionFromParam(suspensionParam(dated))).toEqual(dated);
    expect(suspensionFromParam(null)).toBeNull();
  });

  it('leaves once on a suspended 401, however many requests fail at the same time', () => {
    const navigate = vi.fn();
    expect(leaveIfSuspended(suspended, navigate)).toBe(true);
    expect(leaveIfSuspended(suspended, navigate)).toBe(true);
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(suspendedExitPath({ pendingReview: true, until: null }));
  });

  it('treats a plain expired session (401 without the code) as no suspension', () => {
    const navigate = vi.fn();
    const expired = new ApiError({ message: 'Tu cuenta está suspendida', status: 401, kind: 'unauthorized' });
    expect(leaveIfSuspended(expired, navigate)).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });
});
