import { NextResponse, type NextRequest } from 'next/server';
import { emailPinSchema } from '@/shared/api/schemas';
import { backendRequest } from '@/shared/server/backend';
import { relayJson, sessionTokenOrReject } from '@/shared/server/bff-route';

/** Redeems the PIN for the session's own account. Errors keep their `EMAIL_PIN_*` code. */
export async function POST(request: NextRequest) {
  const token = await sessionTokenOrReject(request);
  if (typeof token !== 'string') return token;
  const input = emailPinSchema.safeParse(await request.json().catch(() => null));
  if (!input.success)
    return NextResponse.json(
      { detail: 'El código son seis dígitos.', code: 'EMAIL_PIN_INVALID' },
      { status: 400 },
    );
  return relayJson(
    await backendRequest('/auth/email/verify/confirm', {
      method: 'POST',
      token,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input.data),
    }),
  );
}
