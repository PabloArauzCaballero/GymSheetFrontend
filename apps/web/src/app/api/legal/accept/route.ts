import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { acceptLegalDocumentsSchema } from '@/shared/api/schemas';
import { SESSION_COOKIE } from '@/shared/auth/constants';
import { backendRequest } from '@/shared/server/backend';
import { isTrustedMutation } from '@/shared/server/csrf';
import {
  CLIENT_PLATFORM_HEADER,
  WEB_CLIENT_PLATFORM,
  relayBackendResponse,
} from '@/shared/server/legal';

export async function POST(request: NextRequest) {
  if (!isTrustedMutation(request))
    return NextResponse.json({ detail: 'Origen no permitido.' }, { status: 403 });
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ detail: 'Autenticación requerida.' }, { status: 401 });
  const input = acceptLegalDocumentsSchema.safeParse(await request.json().catch(() => null));
  if (!input.success)
    return NextResponse.json({ detail: 'Documentos inválidos.' }, { status: 400 });
  const backendResponse = await backendRequest('/me/legal/accept', {
    method: 'POST',
    token,
    headers: { 'Content-Type': 'application/json', [CLIENT_PLATFORM_HEADER]: WEB_CLIENT_PLATFORM },
    body: JSON.stringify(input.data),
  });
  return relayBackendResponse(backendResponse);
}
