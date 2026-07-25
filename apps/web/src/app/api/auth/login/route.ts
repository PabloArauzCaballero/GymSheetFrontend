import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { isTrustedMutation } from '@/shared/server/csrf';
import { backendRequest, readBackendJson } from '@/shared/server/backend';
import { SESSION_COOKIE, sessionCookieOptions } from '@/shared/server/auth-cookie';

const loginSchema = z.object({
  email: z.string().email().max(180),
  password: z.string().min(8).max(128),
});

const authEnvelopeSchema = z.object({
  ok: z.literal(true),
  data: z.object({
    accessToken: z.string().min(20),
    tokenType: z.literal('Bearer'),
    user: z.object({
      id: z.string().uuid(),
      email: z.string().email(),
      nombreCompleto: z.string(),
      rol: z.string(),
    }),
  }),
});

export async function POST(request: NextRequest) {
  if (!isTrustedMutation(request))
    return NextResponse.json({ detail: 'Origen no permitido.' }, { status: 403 });
  const input = loginSchema.safeParse(await request.json().catch(() => null));
  if (!input.success)
    return NextResponse.json({ detail: 'Credenciales inválidas.' }, { status: 400 });
  const backendResponse = await backendRequest('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input.data),
  });
  const payload = await readBackendJson(backendResponse);
  if (!backendResponse.ok) return NextResponse.json(payload, { status: backendResponse.status });
  const parsed = authEnvelopeSchema.safeParse(payload);
  if (!parsed.success)
    return NextResponse.json({ detail: 'Contrato de autenticación inválido.' }, { status: 502 });
  const response = NextResponse.json({ ok: true, data: { user: parsed.data.data.user } });
  response.cookies.set(SESSION_COOKIE, parsed.data.data.accessToken, sessionCookieOptions());
  return response;
}
