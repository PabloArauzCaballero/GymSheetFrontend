import { describe, expect, it } from 'vitest';
import {
  decodeImpersonation,
  encodeImpersonation,
  expiredImpersonationCookieOptions,
  impersonationCookieOptions,
  impersonationMaxAge,
  jwtClaims,
} from './impersonation';

const NOW = Date.UTC(2026, 10, 16, 12, 0, 0);
const nowSeconds = NOW / 1000;

/** An unsigned JWT-shaped token: the BFF never verifies signatures, the backend does. */
function token(claims: Record<string, unknown>): string {
  const part = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${part({ alg: 'HS256', typ: 'JWT' })}.${part(claims)}.firma-del-backend`;
}

const admin = 'a0000000-0000-4000-8000-000000000001';
const session = token({ sub: admin, exp: nowSeconds + 8 * 3600 });
const scoped = token({ sub: admin, tenantId: 'norte', exp: nowSeconds + 15 * 60 });
const state = { accessToken: scoped, tenantId: 'norte', nombre: 'Gimnasio Norte' };

describe('jwtClaims', () => {
  it('reads sub and exp without verifying', () => {
    expect(jwtClaims(scoped)).toMatchObject({ sub: admin, exp: nowSeconds + 900 });
  });
  it('returns null for anything that is not a JWT payload', () => {
    expect(jwtClaims('no-es-un-token')).toBeNull();
    expect(jwtClaims('a.%%%.c')).toBeNull();
  });
});

describe('impersonationMaxAge', () => {
  it('ends the cookie 30 s before the scoped token expires', () => {
    expect(impersonationMaxAge(scoped, NOW)).toBe(15 * 60 - 30);
  });
  it('is 0 for an expired token or one without exp', () => {
    expect(impersonationMaxAge(token({ sub: admin, exp: nowSeconds - 1 }), NOW)).toBe(0);
    expect(impersonationMaxAge(token({ sub: admin }), NOW)).toBe(0);
  });
});

describe('decodeImpersonation', () => {
  it('round-trips the state for the session owner', () => {
    expect(decodeImpersonation(encodeImpersonation(state), session, NOW)).toEqual(state);
  });

  it('ignores the cookie when another account holds the session', () => {
    const otherSession = token({ sub: 'b0000000-0000-4000-8000-000000000002', exp: nowSeconds + 3600 });
    expect(decodeImpersonation(encodeImpersonation(state), otherSession, NOW)).toBeNull();
  });

  it('ignores it without a session, once expired, or when tampered with', () => {
    const raw = encodeImpersonation(state);
    expect(decodeImpersonation(raw, undefined, NOW)).toBeNull();
    expect(decodeImpersonation(raw, session, NOW + 15 * 60 * 1000)).toBeNull();
    expect(decodeImpersonation('basura', session, NOW)).toBeNull();
    expect(
      decodeImpersonation(encodeImpersonation({ ...state, tenantId: '../otro' }), session, NOW),
    ).toBeNull();
  });
});

describe('cookie options', () => {
  it('are HttpOnly, SameSite=Lax and site-wide, like the session cookie', () => {
    expect(impersonationCookieOptions(870)).toMatchObject({
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 870,
    });
    expect(expiredImpersonationCookieOptions()).toMatchObject({ httpOnly: true, maxAge: 0 });
  });
});
