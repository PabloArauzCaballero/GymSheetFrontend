import 'server-only';
import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies';
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from '@/shared/auth/constants';
import { cookieSecure } from './cookie-secure';

export function sessionCookieOptions(): Partial<ResponseCookie> {
  return {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: '/',
  };
}

export function expiredSessionCookieOptions(): Partial<ResponseCookie> {
  return {
    ...sessionCookieOptions(),
    maxAge: 0,
    expires: new Date(0),
  };
}

export { SESSION_COOKIE };
