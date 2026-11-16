import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies';
import { cookieSecure } from './cookie-secure';

/**
 * Random id of this browser «installation», owned by the BFF. The backend uses
 * it to tell devices apart (`GET /me/devices`); it is never a hardware id and
 * JavaScript cannot read it. No `server-only`: `proxy.ts` mints it too.
 */
export const INSTALLATION_COOKIE = 'gymsheet_installation';
export const INSTALLATION_MAX_AGE_SECONDS = 60 * 60 * 24 * 365 * 2;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export function isInstallationId(value: string | undefined | null): value is string {
  return typeof value === 'string' && UUID.test(value);
}

export function installationCookieOptions(): Partial<ResponseCookie> {
  return {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: 'lax',
    maxAge: INSTALLATION_MAX_AGE_SECONDS,
    path: '/',
  };
}
