import 'server-only';
import { timingSafeEqual } from 'node:crypto';
import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { identityProfileCompletionSchema } from '@/shared/api/schemas';
import { SESSION_COOKIE, sessionCookieOptions } from './auth-cookie';
import { cookieSecure } from './cookie-secure';

/** Per-attempt nonce, bound into the Google ID token and checked here before forwarding. */
export const GOOGLE_NONCE_COOKIE = 'gymsheet_google_nonce';
/** Backend signup token while the person completes the profile; JavaScript never sees it. */
export const GOOGLE_SIGNUP_COOKIE = 'gymsheet_google_signup';

/** Short-lived, HttpOnly and only sent to the Google BFF routes. */
export function googleCookieOptions(maxAgeSeconds: number): Partial<ResponseCookie> {
  return {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: 'strict',
    maxAge: maxAgeSeconds,
    path: '/api/auth/google',
  };
}

export const NONCE_MAX_AGE_SECONDS = 10 * 60;
/** Matches the backend signup token lifetime (15 min). */
export const SIGNUP_MAX_AGE_SECONDS = 15 * 60;

export function sameNonce(expected: string | undefined, received: string): boolean {
  if (!expected) return false;
  const left = Buffer.from(expected);
  const right = Buffer.from(received);
  return left.length === right.length && timingSafeEqual(left, right);
}

const authenticatedSchema = z.object({
  status: z.literal('AUTHENTICATED'),
  accessToken: z.string().min(20),
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    nombreCompleto: z.string(),
    rol: z.string(),
    emailVerified: z.boolean().optional(),
  }),
});
const resultEnvelopeSchema = z.object({
  ok: z.literal(true),
  data: z.discriminatedUnion('status', [authenticatedSchema, identityProfileCompletionSchema]),
});

/**
 * Turns a successful `POST /auth/google[/complete]` into the browser answer:
 * the session token goes to its HttpOnly cookie, the signup token to its own,
 * and the body only says what happened next.
 */
export function identityResultResponse(payload: unknown): NextResponse {
  const parsed = resultEnvelopeSchema.safeParse(payload);
  if (!parsed.success)
    return NextResponse.json({ detail: 'Contrato de autenticación inválido.' }, { status: 502 });
  const result = parsed.data.data;
  if (result.status === 'AUTHENTICATED') {
    const response = NextResponse.json({
      ok: true,
      data: { status: result.status, user: result.user },
    });
    response.cookies.set(SESSION_COOKIE, result.accessToken, sessionCookieOptions());
    response.cookies.set(GOOGLE_SIGNUP_COOKIE, '', googleCookieOptions(0));
    return response;
  }
  const response = NextResponse.json({
    ok: true,
    data: { status: result.status, email: result.email },
  });
  response.cookies.set(
    GOOGLE_SIGNUP_COOKIE,
    result.signupToken,
    googleCookieOptions(SIGNUP_MAX_AGE_SECONDS),
  );
  return response;
}
