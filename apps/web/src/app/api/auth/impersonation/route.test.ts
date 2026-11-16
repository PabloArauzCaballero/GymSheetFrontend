import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DELETE, POST } from './route';

const mocks = vi.hoisted(() => ({ backendRequest: vi.fn(), session: undefined as string | undefined }));
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === 'gymsheet_session' && mocks.session ? { name, value: mocks.session } : undefined,
  }),
}));
vi.mock('@/shared/server/backend', () => ({
  backendRequest: mocks.backendRequest,
  readBackendJson: async (response: Response) => response.json(),
}));

const exp = Math.floor(Date.now() / 1000) + 15 * 60;
const part = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
const scopedToken = `${part({ alg: 'HS256' })}.${part({ sub: 'admin', tenantId: 'norte', exp })}.sig`;

function request(method: 'POST' | 'DELETE', body?: unknown, headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost:3002/api/auth/impersonation', {
    method,
    headers: { 'Content-Type': 'application/json', origin: 'http://localhost:3002', ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

function backendAnswers() {
  mocks.backendRequest.mockImplementation(async (path: string) =>
    path === '/auth/impersonate-tenant'
      ? Response.json({
          ok: true,
          data: { accessToken: scopedToken, tokenType: 'Bearer', tenantId: 'norte', expiresIn: '15m' },
        })
      : Response.json({ ok: true, data: [{ id: 'norte', nombre: 'Gimnasio Norte', activo: true }] }),
  );
}

beforeEach(() => {
  mocks.session = 'token-de-sesion-propio';
});
afterEach(() => vi.clearAllMocks());

describe('POST /api/auth/impersonation', () => {
  it('stores the scoped token in its own HttpOnly cookie and never returns it', async () => {
    backendAnswers();
    const response = await POST(request('POST', { tenantId: 'norte' }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ ok: true, data: { tenantId: 'norte', nombre: 'Gimnasio Norte' } });
    expect(JSON.stringify(body)).not.toContain(scopedToken);

    const cookie = response.headers.get('set-cookie') ?? '';
    expect(cookie).toMatch(/^gymsheet_impersonation=/u);
    expect(cookie).toMatch(/HttpOnly/iu);
    expect(cookie).toMatch(/SameSite=lax/iu);
    expect(cookie).not.toMatch(/gymsheet_session=/u);
    const maxAge = Number(/Max-Age=(\d+)/iu.exec(cookie)?.[1]);
    expect(maxAge).toBeGreaterThan(0);
    expect(maxAge).toBeLessThanOrEqual(15 * 60 - 30);

    // Minted with the account's own token; the gym name comes from the catalog.
    expect(mocks.backendRequest).toHaveBeenCalledWith(
      '/auth/impersonate-tenant',
      expect.objectContaining({ method: 'POST', token: 'token-de-sesion-propio', body: '{"tenantId":"norte"}' }),
    );
  });

  it('rejects a cross-site request before reaching the backend', async () => {
    const response = await POST(
      request('POST', { tenantId: 'norte' }, { origin: 'https://evil.example', 'sec-fetch-site': 'cross-site' }),
    );
    expect(response.status).toBe(403);
    expect(mocks.backendRequest).not.toHaveBeenCalled();
  });

  it('needs a session and a valid gym id', async () => {
    mocks.session = undefined;
    expect((await POST(request('POST', { tenantId: 'norte' }))).status).toBe(401);
    mocks.session = 'token-de-sesion-propio';
    expect((await POST(request('POST', { tenantId: '../admin' }))).status).toBe(400);
    expect(mocks.backendRequest).not.toHaveBeenCalled();
  });

  it('relays the backend refusal without setting any cookie', async () => {
    mocks.backendRequest.mockResolvedValue(Response.json({ detail: 'Prohibido.' }, { status: 403 }));
    const response = await POST(request('POST', { tenantId: 'norte' }));
    expect(response.status).toBe(403);
    expect(response.headers.get('set-cookie')).toBeNull();
  });
});

describe('DELETE /api/auth/impersonation', () => {
  it('expires only the impersonation cookie', async () => {
    const response = await DELETE(request('DELETE'));
    expect(response.status).toBe(200);
    const cookie = response.headers.get('set-cookie') ?? '';
    expect(cookie).toMatch(/^gymsheet_impersonation=;/u);
    expect(cookie).toMatch(/Max-Age=0/iu);
    expect(cookie).not.toMatch(/gymsheet_session=/u);
  });

  it('rejects a cross-site exit', async () => {
    const response = await DELETE(
      request('DELETE', undefined, { origin: 'https://evil.example', 'sec-fetch-site': 'cross-site' }),
    );
    expect(response.status).toBe(403);
  });
});
