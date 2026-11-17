import 'server-only';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/shared/auth/constants';
import { expiredSessionCookieOptions } from './auth-cookie';
import { readBackendJson } from './backend';
import { isTrustedMutation } from './csrf';
import { TENANT_COOKIE } from '@/shared/theme/tenant-cookie';

/**
 * Session token of a BFF route, or the response that ends it: 403 for a
 * cross-site mutation (same CSRF check as every other route), 401 without
 * a session.
 */
export async function sessionTokenOrReject(request: NextRequest): Promise<string | NextResponse> {
  if (!isTrustedMutation(request))
    return NextResponse.json({ detail: 'Origen no permitido.' }, { status: 403 });
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ detail: 'Autenticación requerida.' }, { status: 401 });
  return token;
}

/**
 * Relays a backend answer as JSON. A 204 becomes `{ ok: true, data: null }`
 * (a 204 cannot carry a body, and the browser clients parse one envelope), and
 * a 401 clears the session cookie like the generic proxy does.
 */
export async function relayJson(backendResponse: Response) {
  const payload = await readBackendJson(backendResponse);
  const response =
    backendResponse.status === 204
      ? NextResponse.json({ ok: true, data: null })
      : NextResponse.json(payload, { status: backendResponse.status });
  response.headers.set('Cache-Control', 'no-store');
  if (backendResponse.status === 401) {
    response.cookies.set(SESSION_COOKIE, '', expiredSessionCookieOptions());
  }
  return response;
}

/**
 * Gym the account signs up to: from the tenant cookie the access URL set, and
 * never from the request body (otherwise anyone could join any gym by typing
 * another value). Without a cookie the backend applies its `DEFAULT_TENANT_ID`.
 */
export function tenantFromCookie(request: NextRequest): string | undefined {
  const value = request.cookies.get(TENANT_COOKIE)?.value?.trim().toLowerCase();
  return value && /^[a-z0-9][a-z0-9-]*$/.test(value) ? value : undefined;
}
