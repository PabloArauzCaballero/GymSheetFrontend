import { NextResponse } from 'next/server';
import { getSession } from '@/shared/server/session';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true, data: session });
}
