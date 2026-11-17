import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { identityCompletionPayloadSchema } from '@/shared/api/schemas';
import { backendRequest, readBackendJson } from '@/shared/server/backend';
import { tenantFromCookie } from '@/shared/server/bff-route';
import { isTrustedMutation } from '@/shared/server/csrf';
import {
  GOOGLE_SIGNUP_COOKIE,
  googleCookieOptions,
  identityResultResponse,
} from '@/shared/server/google-identity';

const inputSchema = identityCompletionPayloadSchema.omit({ signupToken: true });

/** Creates the account of a Google identity with the profile the person just completed. */
export async function POST(request: NextRequest) {
  if (!isTrustedMutation(request))
    return NextResponse.json({ detail: 'Origen no permitido.' }, { status: 403 });
  const signupToken = request.cookies.get(GOOGLE_SIGNUP_COOKIE)?.value;
  if (!signupToken)
    return NextResponse.json(
      { code: 'SIGNUP_TOKEN_INVALID', detail: 'Vuelve a continuar con Google.' },
      { status: 401 },
    );
  const input = inputSchema.safeParse(await request.json().catch(() => null));
  if (!input.success)
    return NextResponse.json(
      {
        detail: 'Datos inválidos.',
        issues: { fieldErrors: z.flattenError(input.error).fieldErrors },
      },
      { status: 400 },
    );
  const backendResponse = await backendRequest('/auth/google/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...input.data, signupToken, tenantId: tenantFromCookie(request) }),
  });
  const payload = await readBackendJson(backendResponse);
  if (backendResponse.ok) return identityResultResponse(payload);
  const response = NextResponse.json(payload, { status: backendResponse.status });
  // An expired or used signup token cannot be retried: start over with Google.
  if (backendResponse.status === 401)
    response.cookies.set(GOOGLE_SIGNUP_COOKIE, '', googleCookieOptions(0));
  return response;
}
