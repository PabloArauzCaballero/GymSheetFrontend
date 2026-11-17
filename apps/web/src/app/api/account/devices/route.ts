import type { NextRequest } from 'next/server';
import { backendRequest } from '@/shared/server/backend';
import { relayJson, sessionTokenOrReject } from '@/shared/server/bff-route';

/** Devices of the account; `current` is resolved from this browser's installation cookie. */
export async function GET(request: NextRequest) {
  const token = await sessionTokenOrReject(request);
  if (typeof token !== 'string') return token;
  return relayJson(await backendRequest('/me/devices', { token }));
}
