import 'server-only';
import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { SESSION_COOKIE } from '@/shared/auth/constants';
import { cookieSecure } from './cookie-secure';

/**
 * The gym a `SYSTEM_ADMIN` is operating (`POST /auth/impersonate-tenant`).
 *
 * The scoped token lives in its own HttpOnly cookie, next to the session one and
 * never instead of it: leaving it is just dropping this cookie, and the session
 * token is untouched. The backend issues it without a refresh token (15 min by
 * default), so the cookie dies with the token.
 */
export const IMPERSONATION_COOKIE = 'gymsheet_impersonation';

/** Seconds shaved off the token expiry so a skewed clock never sends a dead token. */
const EXPIRY_MARGIN_SECONDS = 30;

const tenantIdSchema = z.string().regex(/^[a-z0-9][a-z0-9-]*$/u).max(60);

const stateSchema = z.object({
  accessToken: z.string().min(20),
  tenantId: tenantIdSchema,
  nombre: z.string().trim().min(1).max(120),
});

export type ImpersonationState = z.infer<typeof stateSchema>;
/** What the page may know: never the token. */
export type ImpersonatedGym = Pick<ImpersonationState, 'tenantId' | 'nombre'>;

export { tenantIdSchema as impersonationTenantIdSchema };

const claimsSchema = z.object({ sub: z.string().optional(), exp: z.number().optional() });

/**
 * Unverified JWT claims. The BFF holds no signing secret and does not need one:
 * the backend verifies every token. These claims only bind the scoped token to
 * the session owner and size the cookie.
 */
export function jwtClaims(token: string): z.infer<typeof claimsSchema> | null {
  const payload = token.split('.')[1];
  if (!payload) return null;
  try {
    const parsed = claimsSchema.safeParse(JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** Cookie lifetime: until the token expires (minus a margin), 0 if it already did. */
export function impersonationMaxAge(accessToken: string, nowMs: number = Date.now()): number {
  const exp = jwtClaims(accessToken)?.exp;
  if (exp === undefined) return 0;
  return Math.max(0, Math.floor(exp - nowMs / 1000) - EXPIRY_MARGIN_SECONDS);
}

export function encodeImpersonation(state: ImpersonationState): string {
  return Buffer.from(JSON.stringify(state), 'utf8').toString('base64url');
}

/**
 * The stored state, only when it still belongs to whoever holds the session.
 *
 * The sub check matters on a shared browser: an admin who operated a gym and
 * then someone else signs in must never have their calls sent with the first
 * admin's scoped token.
 */
export function decodeImpersonation(
  raw: string | undefined,
  sessionToken: string | undefined,
  nowMs: number = Date.now(),
): ImpersonationState | null {
  if (!raw || !sessionToken) return null;
  let state: ImpersonationState;
  try {
    const parsed = stateSchema.safeParse(JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')));
    if (!parsed.success) return null;
    state = parsed.data;
  } catch {
    return null;
  }
  const owner = jwtClaims(sessionToken)?.sub;
  if (!owner || jwtClaims(state.accessToken)?.sub !== owner) return null;
  return impersonationMaxAge(state.accessToken, nowMs) > 0 ? state : null;
}

/** Same flags as the session cookie: HttpOnly, Secure, SameSite=Lax, whole site. */
export function impersonationCookieOptions(maxAge: number): Partial<ResponseCookie> {
  return { httpOnly: true, secure: cookieSecure(), sameSite: 'lax', path: '/', maxAge };
}

export function expiredImpersonationCookieOptions(): Partial<ResponseCookie> {
  return { ...impersonationCookieOptions(0), expires: new Date(0) };
}

/** The active impersonation of this request, if any. */
export async function activeImpersonation(): Promise<ImpersonationState | null> {
  const store = await cookies();
  return decodeImpersonation(store.get(IMPERSONATION_COOKIE)?.value, store.get(SESSION_COOKIE)?.value);
}

/** The gym shown in the banner, without the token. */
export async function impersonatedGym(): Promise<ImpersonatedGym | null> {
  const state = await activeImpersonation();
  return state ? { tenantId: state.tenantId, nombre: state.nombre } : null;
}
