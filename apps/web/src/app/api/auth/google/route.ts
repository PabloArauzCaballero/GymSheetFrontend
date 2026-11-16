import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { backendRequest, readBackendJson } from '@/shared/server/backend';
import { isTrustedMutation } from '@/shared/server/csrf';
import {
  GOOGLE_NONCE_COOKIE,
  googleCookieOptions,
  identityResultResponse,
  sameNonce,
} from '@/shared/server/google-identity';

const inputSchema = z.object({
  idToken: z.string().trim().min(20).max(8192),
  nonce: z.string().min(16).max(128),
});

/**
 * Google sign-in. The nonce must be the one this BFF issued for the attempt
 * (cookie), so a token minted for another page or replayed later is refused
 * before it reaches the backend, which then checks the token's own claim.
 */
export async function POST(request: NextRequest) {
  if (!isTrustedMutation(request))
    return NextResponse.json({ detail: 'Origen no permitido.' }, { status: 403 });
  const input = inputSchema.safeParse(await request.json().catch(() => null));
  const expected = request.cookies.get(GOOGLE_NONCE_COOKIE)?.value;
  const response =
    !input.success || !sameNonce(expected, input.data.nonce)
      ? NextResponse.json(
          { code: 'IDENTITY_TOKEN_INVALID', detail: 'No pudimos validar tu cuenta de Google.' },
          { status: 401 },
        )
      : await forward(input.data);
  // Single use: whatever happened, the next attempt asks for a new nonce.
  response.cookies.set(GOOGLE_NONCE_COOKIE, '', googleCookieOptions(0));
  return response;
}

async function forward(input: z.infer<typeof inputSchema>) {
  const backendResponse = await backendRequest('/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const payload = await readBackendJson(backendResponse);
  if (!backendResponse.ok) return NextResponse.json(payload, { status: backendResponse.status });
  return identityResultResponse(payload);
}
