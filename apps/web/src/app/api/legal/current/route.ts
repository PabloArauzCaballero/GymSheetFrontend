import { backendRequest } from '@/shared/server/backend';
import { relayBackendResponse } from '@/shared/server/legal';

/** Public: the signup form needs the current versions before any session exists. */
export async function GET() {
  return relayBackendResponse(await backendRequest('/legal/current'));
}
