import { NextResponse, type NextRequest } from 'next/server';
import { isTrustedMutation } from '@/shared/server/csrf';
import { expiredSessionCookieOptions, SESSION_COOKIE } from '@/shared/server/auth-cookie';
import { expiredImpersonationCookieOptions, IMPERSONATION_COOKIE } from '@/shared/server/impersonation';
import { safeReturnUrl } from '@/shared/server/safe-return-url';

function clearSession(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, '', expiredSessionCookieOptions());
  // Signing out also stops operating a gym: the scoped token must not outlive the session.
  response.cookies.set(IMPERSONATION_COOKIE, '', expiredImpersonationCookieOptions());
  return response;
}

export function GET(request: NextRequest) {
  const returnTo = safeReturnUrl(request.nextUrl.searchParams.get('returnTo'), request.url);
  return clearSession(NextResponse.redirect(returnTo));
}

export function POST(request: NextRequest) {
  if (!isTrustedMutation(request)) {
    return NextResponse.json({ detail: 'Origen no permitido.' }, { status: 403 });
  }
  return clearSession(NextResponse.json({ ok: true }));
}
