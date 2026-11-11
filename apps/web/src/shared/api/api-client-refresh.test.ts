import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { createApiClient } from '@gymsheet/api-client';

const ok = (data: unknown) =>
  new Response(JSON.stringify({ ok: true, data }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
const unauthorized = () =>
  new Response(JSON.stringify({ detail: 'Token vencido' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });

function bearerClient(options: {
  responses: Response[];
  refresh: () => Promise<'refreshed' | 'rejected' | 'unavailable'>;
}) {
  let token = 'old-access';
  const seenTokens: (string | null)[] = [];
  const fetchImpl = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
    seenTokens.push(new Headers(init?.headers).get('Authorization'));
    const next = options.responses.shift();
    if (!next) throw new Error('unexpected request');
    return next;
  });
  const onUnauthorized = vi.fn();
  const client = createApiClient({
    baseUrl: 'https://api.test',
    fetchImpl: fetchImpl as unknown as typeof fetch,
    tokenProvider: {
      getAccessToken: async () => token,
      setAccessToken: async (value) => {
        token = value;
      },
      clear: async () => {},
    },
    onUnauthorized,
    refreshSession: async () => {
      const outcome = await options.refresh();
      if (outcome === 'refreshed') token = 'new-access';
      return outcome;
    },
  });
  return { client, fetchImpl, onUnauthorized, seenTokens };
}

describe('api client · renewal on 401', () => {
  it('renews and retries once with the new token, transparently', async () => {
    const { client, onUnauthorized, seenTokens } = bearerClient({
      responses: [unauthorized(), ok({ name: 'Ana' })],
      refresh: async () => 'refreshed',
    });

    await expect(client.request('/auth/me', z.object({ name: z.string() }))).resolves.toEqual({
      name: 'Ana',
    });
    expect(seenTokens).toEqual(['Bearer old-access', 'Bearer new-access']);
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('a rejected renewal ends the session', async () => {
    const { client, onUnauthorized } = bearerClient({
      responses: [unauthorized()],
      refresh: async () => 'rejected',
    });

    await expect(client.request('/workouts', z.unknown())).rejects.toMatchObject({ status: 401 });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('without signal the session is kept and the error is a network one', async () => {
    const { client, onUnauthorized } = bearerClient({
      responses: [unauthorized()],
      refresh: async () => 'unavailable',
    });

    await expect(client.request('/workouts', z.unknown())).rejects.toMatchObject({
      kind: 'network',
    });
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('a second 401 after renewing does not loop', async () => {
    const refresh = vi.fn(async () => 'refreshed' as const);
    const { client, fetchImpl, onUnauthorized } = bearerClient({
      responses: [unauthorized(), unauthorized()],
      refresh,
    });

    await expect(client.request('/workouts', z.unknown())).rejects.toMatchObject({ status: 401 });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('a 401 on the login itself is a bad password, never a renewal', async () => {
    const refresh = vi.fn(async () => 'refreshed' as const);
    const { client } = bearerClient({ responses: [unauthorized()], refresh });

    await expect(client.request('/auth/login', z.unknown())).rejects.toMatchObject({ status: 401 });
    expect(refresh).not.toHaveBeenCalled();
  });
});
