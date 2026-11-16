import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/shared/auth/constants';
import { backendRequest } from '@/shared/server/backend';
import { relayBackendResponse } from '@/shared/server/legal';

export async function GET() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ detail: 'Autenticación requerida.' }, { status: 401 });
  return relayBackendResponse(await backendRequest('/me/legal/pending', { token }));
}
