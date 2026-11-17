import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET, POST } from './route';

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

// A gym-scoped admin read that survives franja 8e (`/admin/membership/plans` was retired).
const call = () =>
  GET(new NextRequest('http://localhost:3002/api/backend/admin/equipment'), {
    params: Promise.resolve({ path: ['admin', 'equipment'] }),
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

describe('/api/backend without a session (public marketplace, franja 8c)', () => {
  const get = (parts: string[], method = 'GET') =>
    GET(new NextRequest(`http://localhost:3002/api/backend/${parts.join('/')}?limit=24`, { method }), {
      params: Promise.resolve({ path: parts }),
    });

  it('forwards a public listings read with no token', async () => {
    mocks.jar.clear();
    const response = await get(['public', 'directory', 'listings']);
    expect(response.status).toBe(200);
    expect(mocks.backendRequest.mock.calls[0]?.[0]).toBe('/public/directory/listings?limit=24');
    expect(sentToken()).toBeUndefined();
  });

  it('still asks for a session anywhere else', async () => {
    mocks.jar.clear();
    expect((await get(['business', 'me', 'listings'])).status).toBe(401);
    expect(mocks.backendRequest).not.toHaveBeenCalled();
  });
});

describe('/api/backend with an order receipt (franja 8d)', () => {
  const id = '0190e2cb-a6d4-7ec3-8f91-a6c735631501';
  it('forwards the multipart bytes and its boundary untouched, with the upload timeout', async () => {
    // A hand-built multipart body with binary bytes (0x00, 0xff) that a text decode would corrupt.
    const boundary = '----repp-test-boundary';
    const contentType = `multipart/form-data; boundary=${boundary}`;
    const head = new TextEncoder().encode(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="c.png"\r\nContent-Type: image/png\r\n\r\n`);
    const tail = new TextEncoder().encode(`\r\n--${boundary}--\r\n`);
    const bytes = new Uint8Array([...head, 0x89, 0x50, 0x4e, 0x47, 0x00, 0xff, ...tail]);
    const request = new NextRequest(`http://localhost:3002/api/backend/directory/payments/orders/${id}/receipt`, {
      method: 'POST',
      body: bytes,
      headers: { 'content-type': contentType },
    });
    await POST(request, { params: Promise.resolve({ path: ['directory', 'payments', 'orders', id, 'receipt'] }) });
    const [path, init] = mocks.backendRequest.mock.calls[0] as [string, { method: string; body: ArrayBuffer; headers: Headers; timeoutMs?: number }];
    expect(path).toBe(`/directory/payments/orders/${id}/receipt`);
    expect(init.method).toBe('POST');
    expect(init.timeoutMs).toBe(60_000);
    expect(init.headers.get('Content-Type')).toBe(contentType);
    expect(contentType).toMatch(/^multipart\/form-data; boundary=/u);
    expect(new Uint8Array(init.body)).toEqual(bytes);
  });

  it('never lets a browser cache the payment QR', async () => {
    mocks.backendRequest.mockResolvedValue(new Response(new Uint8Array([1]), { headers: { 'content-type': 'image/png' } }));
    const response = await GET(new NextRequest(`http://localhost:3002/api/backend/directory/payments/orders/${id}/payment-qr`), {
      params: Promise.resolve({ path: ['directory', 'payments', 'orders', id, 'payment-qr'] }),
    });
    expect(response.headers.get('cache-control')).toBe('private, no-store');
  });
});
