import type { NextRequest } from 'next/server';
import { backendRequest } from '@/shared/server/backend';
import { relayJson, sessionTokenOrReject } from '@/shared/server/bff-route';

/** Signs out every device but this one. */
export async function POST(request: NextRequest) {
  const token = await sessionTokenOrReject(request);
  if (typeof token !== 'string') return token;
  return relayJson(await backendRequest('/me/devices/revoke-others', { method: 'POST', token }));
}
