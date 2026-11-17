import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';

const mocks = vi.hoisted(() => ({ backendRequest: vi.fn(), jar: new Map<string, string>() }));
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (mocks.jar.has(name) ? { name, value: mocks.jar.get(name)! } : undefined),
  }),
}));
vi.mock('@/shared/server/backend', () => ({ backendRequest: mocks.backendRequest }));

const part = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
const exp = Math.floor(Date.now() / 1000) + 15 * 60;
const jwt = (claims: Record<string, unknown>) => `${part({ alg: 'HS256' })}.${part(claims)}.sig`;
const sessionToken = jwt({ sub: 'admin', exp: exp + 3600 });
const scopedToken = jwt({ sub: 'admin', tenantId: 'norte', exp });
const impersonation = part({ accessToken: scopedToken, tenantId: 'norte', nombre: 'Gimnasio Norte' });

const call = () =>
  GET(new NextRequest('http://localhost:3002/api/backend/admin/membership/plans'), {
    params: Promise.resolve({ path: ['admin', 'membership', 'plans'] }),
  });
const sentToken = () => (mocks.backendRequest.mock.calls[0]?.[1] as { token?: string }).token;

beforeEach(() => {
  mocks.jar.clear();
  mocks.jar.set('gymsheet_session', sessionToken);
  mocks.backendRequest.mockResolvedValue(Response.json({ ok: true, data: [] }));
});
afterEach(() => vi.clearAllMocks());

describe('/api/backend while operating a gym', () => {
  it('sends the scoped token instead of the session token', async () => {
    mocks.jar.set('gymsheet_impersonation', impersonation);
    await call();
    expect(sentToken()).toBe(scopedToken);
  });

  it('uses the session token without impersonation or when the cookie belongs to someone else', async () => {
    await call();
    expect(sentToken()).toBe(sessionToken);
    vi.clearAllMocks();
    mocks.backendRequest.mockResolvedValue(Response.json({ ok: true, data: [] }));
    mocks.jar.set('gymsheet_session', jwt({ sub: 'otra-cuenta', exp: exp + 3600 }));
    mocks.jar.set('gymsheet_impersonation', impersonation);
    await call();
    expect(sentToken()).not.toBe(scopedToken);
  });

  it('a 401 on the scoped token ends the impersonation, not the session', async () => {
    mocks.jar.set('gymsheet_impersonation', impersonation);
    mocks.backendRequest.mockResolvedValue(Response.json({ detail: 'Token vencido.' }, { status: 401 }));
    const response = await call();
    const cookie = response.headers.get('set-cookie') ?? '';
    expect(cookie).toMatch(/^gymsheet_impersonation=;/u);
    expect(cookie).not.toMatch(/gymsheet_session=/u);
  });

  it('a 401 on the session token still clears the session', async () => {
    mocks.backendRequest.mockResolvedValue(Response.json({ detail: 'Sesión inválida.' }, { status: 401 }));
    const cookie = (await call()).headers.get('set-cookie') ?? '';
    expect(cookie).toMatch(/^gymsheet_session=;/u);
  });
});

describe('/api/backend with KYC documents', () => {
  const id = '0190e2cb-a6d4-7ec3-8f91-a6c735631501';
  it('streams the decrypted photo and forces no-store even if the backend forgot it', async () => {
    mocks.backendRequest.mockResolvedValue(
      new Response(new Uint8Array([0xff, 0xd8, 0xff]), { headers: { 'content-type': 'image/jpeg', 'cache-control': 'public, max-age=600' } }),
    );
    const response = await GET(new NextRequest(`http://localhost:3002/api/backend/admin/business/kyc/${id}/documents/${id}`), {
      params: Promise.resolve({ path: ['admin', 'business', 'kyc', id, 'documents', id] }),
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(response.headers.get('content-type')).toBe('image/jpeg');
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([0xff, 0xd8, 0xff]));
  });
});
