import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { isTrustedMutation } from '@/shared/server/csrf';
import { backendRequest, readBackendJson } from '@/shared/server/backend';

const schema = z.object({ email: z.string().email().max(180) });

/**
 * Pide al backend un PIN de recuperación.
 *
 * Pasa por el BFF como todo lo demás: el navegador nunca habla con el backend
 * directamente, y aquí es donde se aplica la comprobación de origen que impide
 * que un sitio ajeno dispare envíos de correo en nombre de alguien.
 *
 * La respuesta se devuelve tal cual, incluido el 202 con el que el backend
 * responde exista o no la cuenta. Traducir eso a otra cosa según lo que pasara
 * por detrás convertiría el formulario en un comprobador de direcciones
 * registradas, que es justo lo que el backend evita.
 */
export async function POST(request: NextRequest) {
  if (!isTrustedMutation(request))
    return NextResponse.json({ detail: 'Origen no permitido.' }, { status: 403 });
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success)
    return NextResponse.json({ detail: 'Correo inválido.' }, { status: 400 });
  const backendResponse = await backendRequest('/auth/password-reset/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input.data),
  });
  const payload = await readBackendJson(backendResponse);
  return NextResponse.json(payload, { status: backendResponse.status });
}
