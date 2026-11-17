import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createApiClient } from './client';

function clientAnswering(response: () => Response) {
  return createApiClient({
    baseUrl: 'https://api.test',
    fetchImpl: (async () => response()) as typeof fetch,
    tokenProvider: {
      getAccessToken: async () => 'token',
      setAccessToken: async () => {},
      clear: async () => {},
    },
  });
}

describe('bodiless 204 responses', () => {
  it('reads a 204 No Content as a success with no data', async () => {
    const client = clientAnswering(() => new Response(null, { status: 204 }));
    await expect(client.request('/me/devices/revoke-others', z.null(), { method: 'POST' })).resolves.toBeNull();
  });

  it('still parses the envelope of an ordinary success', async () => {
    const client = clientAnswering(
      () => new Response(JSON.stringify({ ok: true, data: { id: 'a' } }), { status: 200 }),
    );
    await expect(client.request('/me', z.object({ id: z.string() }))).resolves.toEqual({ id: 'a' });
  });
});
