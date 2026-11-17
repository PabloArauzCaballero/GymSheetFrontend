import { backendRequest } from '@/shared/server/backend';
import { relayJson } from '@/shared/server/bff-route';

/** Single-use signup form ticket (public). Fetched when the form opens; never cached. */
export async function GET() {
  return relayJson(await backendRequest('/auth/register/ticket'));
}
