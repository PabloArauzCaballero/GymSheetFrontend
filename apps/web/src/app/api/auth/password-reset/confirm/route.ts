import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { isTrustedMutation } from '@/shared/server/csrf';
import { backendRequest, readBackendJson } from '@/shared/server/backend';

const schema = z.object({
  email: z.string().email().max(180),
  pin: z.string().regex(/^[0-9]{6}$/u),
  password: z.string().min(8).max(128),
});

/**
 * Canjea el PIN por una contraseña nueva.
 *
 * No abre sesión al terminar. Cambiar la contraseña y quedar dentro son dos
 * cosas distintas, y encadenarlas significaría que quien tuviera el código
 * entraría sin volver a escribir nada: el inicio de sesión posterior es la
 * comprobación de que la contraseña nueva es la que la persona cree.
 */
export async function POST(request: NextRequest) {
  if (!isTrustedMutation(request))
    return NextResponse.json({ detail: 'Origen no permitido.' }, { status: 403 });
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success)
    return NextResponse.json({ detail: 'Datos inválidos.' }, { status: 400 });
  const backendResponse = await backendRequest('/auth/password-reset/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input.data),
  });
  const payload = await readBackendJson(backendResponse);
  return NextResponse.json(payload, { status: backendResponse.status });
}
