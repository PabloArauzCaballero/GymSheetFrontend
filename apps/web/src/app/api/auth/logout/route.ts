import { NextResponse, type NextRequest } from 'next/server';
import { isTrustedMutation } from '@/shared/server/csrf';
import { expiredSessionCookieOptions, SESSION_COOKIE } from '@/shared/server/auth-cookie';

function clearSession(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, '', expiredSessionCookieOptions());
  return response;
}

export function GET(request: NextRequest) {
  const requestedReturn = request.nextUrl.searchParams.get('returnTo');
  const returnTo =
    requestedReturn?.startsWith('/') && !requestedReturn.startsWith('//')
      ? requestedReturn
      : '/login';
  return clearSession(NextResponse.redirect(new URL(returnTo, request.url)));
}

export function POST(request: NextRequest) {
  if (!isTrustedMutation(request)) {
    return NextResponse.json({ detail: 'Origen no permitido.' }, { status: 403 });
  }
  return clearSession(NextResponse.json({ ok: true }));
}
