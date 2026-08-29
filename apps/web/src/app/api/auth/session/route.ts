import { NextResponse } from 'next/server';
import { BackendUnavailableError, getSession } from '@/shared/server/session';

export async function GET() {
  let session;
  try {
    session = await getSession();
  } catch (error: unknown) {
    // 503 y no 401: un 401 le diría al cliente que la sesión ha caducado y le
    // llevaría a volver a autenticarse por un fallo pasajero del backend.
    if (error instanceof BackendUnavailableError) {
      return NextResponse.json({ ok: false, detail: error.message }, { status: 503 });
    }
    throw error;
  }
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true, data: session });
}
