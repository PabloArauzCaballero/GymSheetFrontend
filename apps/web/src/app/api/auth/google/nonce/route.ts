import { randomBytes } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { isTrustedMutation } from '@/shared/server/csrf';
import {
  GOOGLE_NONCE_COOKIE,
  NONCE_MAX_AGE_SECONDS,
  googleCookieOptions,
} from '@/shared/server/google-identity';

/** A fresh nonce per attempt: returned to Google Identity Services and kept in an HttpOnly cookie. */
export async function POST(request: NextRequest) {
  if (!isTrustedMutation(request))
    return NextResponse.json({ detail: 'Origen no permitido.' }, { status: 403 });
  const nonce = randomBytes(32).toString('base64url');
  const response = NextResponse.json({ ok: true, data: { nonce } });
  response.headers.set('Cache-Control', 'no-store');
  response.cookies.set(GOOGLE_NONCE_COOKIE, nonce, googleCookieOptions(NONCE_MAX_AGE_SECONDS));
  return response;
}
