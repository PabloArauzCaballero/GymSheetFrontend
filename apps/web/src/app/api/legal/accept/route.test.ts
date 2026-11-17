import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';

const { backendRequest, cookieValue } = vi.hoisted(() => ({
  backendRequest: vi.fn(),
  cookieValue: { current: 'token-123' as string | undefined },
}));
vi.mock('@/shared/server/backend', () => ({
  backendRequest,
  readBackendJson: async (response: Response) => response.json(),
}));
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: () => (cookieValue.current ? { value: cookieValue.current } : undefined),
  }),
}));

const acceptances = [{ document: 'TERMS', version: '2026-08-25' }];

function acceptRequest(body: unknown) {
  return new NextRequest('http://localhost:3001/api/legal/accept', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

afterEach(() => {
  vi.clearAllMocks();
  cookieValue.current = 'token-123';
});

describe('POST /api/legal/accept', () => {
  it('forwards the acceptances with the session and the web platform', async () => {
    backendRequest.mockResolvedValue(Response.json({ ok: true, data: { pending: [] } }));

    const response = await POST(acceptRequest({ acceptances }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, data: { pending: [] } });
    const [path, init] = backendRequest.mock.calls[0] ?? [];
    expect(path).toBe('/me/legal/accept');
    expect(init).toMatchObject({ method: 'POST', token: 'token-123' });
    expect(init.headers).toMatchObject({ 'X-Client-Platform': 'web' });
    expect(JSON.parse(String(init.body))).toEqual({ acceptances });
  });

  it('relays a stale version as 409 with its code', async () => {
    backendRequest.mockResolvedValue(
      Response.json({ status: 409, code: 'TERMS_VERSION_OUTDATED' }, { status: 409 }),
    );
    const response = await POST(acceptRequest({ acceptances }));
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ code: 'TERMS_VERSION_OUTDATED' });
  });

  it('rejects an empty body and a missing session before reaching the backend', async () => {
    expect((await POST(acceptRequest({ acceptances: [] }))).status).toBe(400);
    cookieValue.current = undefined;
    expect((await POST(acceptRequest({ acceptances }))).status).toBe(401);
    expect(backendRequest).not.toHaveBeenCalled();
  });
});
