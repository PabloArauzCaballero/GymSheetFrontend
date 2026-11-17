import { beforeEach, describe, expect, it, vi } from 'vitest';
import { accountSuspensionCopy } from '@gymsheet/domain';
import { ApiError } from '@/shared/api/api-error';
import {
  leaveIfSuspended,
  resetSuspensionExitForTests,
  suspendedExitPath,
  suspendedLoginPath,
  suspensionFromParams,
} from './suspension';

const acoso = { code: 'ACOSO', label: 'Acoso', text: 'mensajes o contenido que hostigan o intimidan a otra persona' };
const suspended = new ApiError({
  message: 'Tu cuenta está suspendida mientras revisamos un reporte.',
  status: 401,
  kind: 'unauthorized',
  code: 'ACCOUNT_SUSPENDED',
  details: { pendingReview: true },
});

const query = (search: string) => new URLSearchParams(search);

describe('suspension exit', () => {
  beforeEach(() => resetSuspensionExitForTests());

  it('clears the session through the BFF logout and lands on login with the suspension', () => {
    expect(suspendedExitPath({ pendingReview: true, until: null, reason: null })).toBe(
      '/api/auth/logout?returnTo=%2Flogin%3Fsuspended%3Dreview',
    );
    const dated = { pendingReview: false, until: '2026-12-01T00:00:00.000Z', reason: acoso };
    const login = suspendedLoginPath(dated);
    expect(suspensionFromParams(query(login.split('?')[1] ?? ''))).toEqual(dated);
    expect(suspensionFromParams(query(''))).toBeNull();
  });

  it('carries only the reason code, never its words', () => {
    const login = suspendedLoginPath({ pendingReview: true, until: null, reason: acoso });
    expect(login).toBe('/login?suspended=review&reason=ACOSO');
    expect(decodeURIComponent(suspendedExitPath({ pendingReview: true, until: null, reason: acoso }))).not.toMatch(
      /hostigan|Acoso/u,
    );
    // A reason the closed list does not know is dropped, not forwarded.
    const unknown = { code: 'NUEVO', label: 'Nuevo', text: 'texto' };
    expect(suspendedLoginPath({ pendingReview: true, until: null, reason: unknown })).toBe('/login?suspended=review');
  });

  it('never turns arbitrary query text into the reason', () => {
    const forged = suspensionFromParams(query('suspended=review&reason=%3Cb%3EPaga%20aqu%C3%AD%3C%2Fb%3E'));
    expect(forged).toEqual({ pendingReview: true, until: null, reason: null });
    const notice = forged ? accountSuspensionCopy.notice(forged) : '';
    expect(notice).toMatch(/^Tu cuenta está suspendida/u);
    expect(notice).not.toMatch(/Paga/u);
    expect(suspensionFromParams(query('suspended=nada&reason=ACOSO'))).toEqual({
      pendingReview: false,
      until: null,
      reason: acoso,
    });
  });

  it('leaves once on a suspended 401, however many requests fail at the same time', () => {
    const navigate = vi.fn();
    expect(leaveIfSuspended(suspended, navigate)).toBe(true);
    expect(leaveIfSuspended(suspended, navigate)).toBe(true);
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(suspendedExitPath({ pendingReview: true, until: null, reason: null }));
  });

  it('treats a plain expired session (401 without the code) as no suspension', () => {
    const navigate = vi.fn();
    const expired = new ApiError({ message: 'Tu cuenta está suspendida', status: 401, kind: 'unauthorized' });
    expect(leaveIfSuspended(expired, navigate)).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });
});
