import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { registerPayloadSchema, signupProtectionFieldsSchema } from '@/shared/api/schemas';
import { isTrustedMutation } from '@/shared/server/csrf';
import { backendRequest, readBackendJson } from '@/shared/server/backend';
import { SESSION_COOKIE, sessionCookieOptions } from '@/shared/server/auth-cookie';
import { tenantFromCookie } from '@/shared/server/bff-route';
import { CLIENT_PLATFORM_HEADER, WEB_CLIENT_PLATFORM } from '@/shared/server/legal';

/**
 * The signup plus its anti-automation evidence (form ticket, honeypot and the
 * Turnstile token). Device attestation is a mobile-only proof: the web never sends it.
 */
const webRegisterPayloadSchema = registerPayloadSchema.extend(
  signupProtectionFieldsSchema.omit({ attestation: true }).shape,
);

const authEnvelopeSchema = z.object({
  ok: z.literal(true),
  data: z.object({
    accessToken: z.string().min(20),
    user: z.object({
      id: z.string().uuid(),
      email: z.string().email(),
      nombreCompleto: z.string(),
      rol: z.string(),
      emailVerified: z.boolean().optional(),
    }),
  }),
});

export async function POST(request: NextRequest) {
  if (!isTrustedMutation(request))
    return NextResponse.json({ detail: 'Origen no permitido.' }, { status: 403 });
  const input = webRegisterPayloadSchema.safeParse(await request.json().catch(() => null));
  // Same problem shape as the backend's 400, so the form can point at each field.
  if (!input.success)
    return NextResponse.json(
      { detail: 'Datos de registro inválidos.', issues: { fieldErrors: z.flattenError(input.error).fieldErrors } },
      { status: 400 },
    );
  const backendResponse = await backendRequest('/auth/register', {
    method: 'POST',
    // The platform is stored with the terms acceptance as audit evidence.
    headers: { 'Content-Type': 'application/json', [CLIENT_PLATFORM_HEADER]: WEB_CLIENT_PLATFORM },
    body: JSON.stringify({ ...input.data, tenantId: tenantFromCookie(request) }),
  });
  const payload = await readBackendJson(backendResponse);
  if (!backendResponse.ok) return NextResponse.json(payload, { status: backendResponse.status });
  const parsed = authEnvelopeSchema.safeParse(payload);
  if (!parsed.success)
    return NextResponse.json({ detail: 'Contrato de registro inválido.' }, { status: 502 });
  const response = NextResponse.json(
    { ok: true, data: { user: parsed.data.data.user } },
    { status: 201 },
  );
  response.cookies.set(SESSION_COOKIE, parsed.data.data.accessToken, sessionCookieOptions());
  return response;
}
