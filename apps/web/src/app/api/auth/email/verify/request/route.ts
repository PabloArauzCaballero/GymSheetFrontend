import type { NextRequest } from 'next/server';
import { backendRequest } from '@/shared/server/backend';
import { relayJson, sessionTokenOrReject } from '@/shared/server/bff-route';

/** Sends a new email PIN. 429 `EMAIL_PIN_COOLDOWN` carries `details.retryAfterSeconds`. */
export async function POST(request: NextRequest) {
  const token = await sessionTokenOrReject(request);
  if (typeof token !== 'string') return token;
  return relayJson(await backendRequest('/auth/email/verify/request', { method: 'POST', token }));
}
