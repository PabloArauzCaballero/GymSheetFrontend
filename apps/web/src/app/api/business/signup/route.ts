import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { businessSignupPayloadSchema, businessSignupResponseSchema } from '@/shared/api/schemas';
import { isTrustedMutation } from '@/shared/server/csrf';
import { backendRequest, readBackendJson } from '@/shared/server/backend';
import { SESSION_COOKIE, sessionCookieOptions } from '@/shared/server/auth-cookie';
import { CLIENT_PLATFORM_HEADER, WEB_CLIENT_PLATFORM } from '@/shared/server/legal';

/** Device attestation is a mobile-only proof: the web never sends it. */
const webBusinessSignupSchema = businessSignupPayloadSchema.omit({ attestation: true });
const envelopeSchema = z.object({ ok: z.literal(true), data: businessSignupResponseSchema });

/**
 * Business signup (ADR-0020). Same contract as the person signup route: the
 * access token goes straight into the HttpOnly cookie and only the account
 * and its DRAFT business come back to the browser.
 */
export async function POST(request: NextRequest) {
  if (!isTrustedMutation(request))
    return NextResponse.json({ detail: 'Origen no permitido.' }, { status: 403 });
  const input = webBusinessSignupSchema.safeParse(await request.json().catch(() => null));
  if (!input.success)
    return NextResponse.json(
      { detail: 'Datos de registro inválidos.', issues: { fieldErrors: z.flattenError(input.error).fieldErrors } },
      { status: 400 },
    );
  const backendResponse = await backendRequest('/business/signup', {
    method: 'POST',
    // The platform is stored with the legal acceptances as audit evidence.
    headers: { 'Content-Type': 'application/json', [CLIENT_PLATFORM_HEADER]: WEB_CLIENT_PLATFORM },
    body: JSON.stringify(input.data),
  });
  const payload = await readBackendJson(backendResponse);
  if (!backendResponse.ok) return NextResponse.json(payload, { status: backendResponse.status });
  const parsed = envelopeSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ detail: 'Contrato de registro inválido.' }, { status: 502 });
  const { accessToken, user, business } = parsed.data.data;
  const response = NextResponse.json({ ok: true, data: { user, business } }, { status: 201 });
  response.cookies.set(SESSION_COOKIE, accessToken, sessionCookieOptions());
  return response;
}
