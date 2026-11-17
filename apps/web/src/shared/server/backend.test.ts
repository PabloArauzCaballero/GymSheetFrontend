import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { backendRequest, clientForwardingHeaders } from './backend';

const incoming = vi.hoisted(() => {
  // One trusted proxy in front of Next, as in production; must be set before env.ts parses it.
  process.env.TRUSTED_PROXY_HOPS = '1';
  return { headers: vi.fn(), cookies: vi.fn() };
});
vi.mock('next/headers', () => ({ headers: incoming.headers, cookies: incoming.cookies }));

/** A route handler cookie store: what `set` writes, `get` reads back in the same request. */
function cookieStore(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  const set = vi.fn((name: string, value: string) => void values.set(name, value));
  return {
    set,
    store: { get: (name: string) => (values.has(name) ? { name, value: values.get(name)! } : undefined), set },
  };
}

function captureFetch() {
  const responder = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
  vi.stubGlobal('fetch', responder);
  return () => new Headers((responder.mock.calls[0]?.[1] as RequestInit).headers);
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
beforeEach(() => {
  incoming.cookies.mockRejectedValue(new Error('cookies was called outside a request scope'));
});

describe('clientForwardingHeaders', () => {
  it('takes the entry written by the trusted proxy, not the one the browser sent', () => {
    const result = clientForwardingHeaders(
      new Headers({ 'x-forwarded-for': '10.9.9.9, 203.0.113.7' }),
      1,
    );
    expect(result['X-Forwarded-For']).toBe('203.0.113.7');
  });

  it('counts several trusted proxies from the right and keeps the User-Agent', () => {
    const result = clientForwardingHeaders(
      new Headers({
        'x-forwarded-for': '1.1.1.1, 2001:db8::1 , 198.51.100.2',
        'user-agent': 'Safari/18',
      }),
      2,
    );
    expect(result).toEqual({ 'X-Forwarded-For': '2001:db8::1', 'User-Agent': 'Safari/18' });
  });

  it('ignores x-real-ip, which the browser can set too', () => {
    const result = clientForwardingHeaders(new Headers({ 'x-real-ip': '203.0.113.7' }), 1);
    expect(result).toEqual({});
  });

  it('forwards no IP when there is no trusted proxy or the value is not an IP', () => {
    expect(clientForwardingHeaders(new Headers({ 'x-forwarded-for': '198.51.100.2' }), 0)).toEqual({});
    expect(clientForwardingHeaders(new Headers({ 'x-forwarded-for': 'unknown' }), 1)).toEqual({});
  });
});

describe('backendRequest', () => {
  it('forwards the client IP and User-Agent but never the browser cookie or authorization', async () => {
    incoming.headers.mockResolvedValue(
      new Headers({
        'x-forwarded-for': '198.51.100.9',
        'user-agent': 'Firefox/140',
        cookie: 'gymsheet_session=browser-token',
        authorization: 'Bearer browser-token',
      }),
    );
    const sent = captureFetch();

    await backendRequest('/me', { token: 'session-token' });

    const headers = sent();
    expect(headers.get('X-Forwarded-For')).toBe('198.51.100.9');
    expect(headers.get('User-Agent')).toBe('Firefox/140');
    expect(headers.get('Authorization')).toBe('Bearer session-token');
    expect(headers.get('Cookie')).toBeNull();
  });

  it('does not override headers set explicitly by the caller', async () => {
    incoming.headers.mockResolvedValue(new Headers({ 'user-agent': 'Firefox/140' }));
    const sent = captureFetch();

    await backendRequest('/health', { headers: { 'User-Agent': 'GymSheet-Job' } });

    expect(sent().get('User-Agent')).toBe('GymSheet-Job');
  });

  it('still reaches the backend when called outside a request scope', async () => {
    incoming.headers.mockRejectedValue(new Error('headers was called outside a request scope'));
    const sent = captureFetch();

    await backendRequest('/public/branches');

    expect(sent().get('X-Forwarded-For')).toBeNull();
    expect(sent().get('Accept')).toBe('application/json');
  });
});

describe('device headers', () => {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;

  it('creates the installation cookie once and forwards the same id on every call', async () => {
    incoming.headers.mockResolvedValue(new Headers());
    const { set, store } = cookieStore();
    incoming.cookies.mockResolvedValue(store);
    const responder = vi.fn().mockImplementation(async () => new Response('{}'));
    vi.stubGlobal('fetch', responder);

    await backendRequest('/auth/me', { token: 't' });
    await backendRequest('/users/me', { token: 't' });

    expect(set).toHaveBeenCalledTimes(1);
    const [name, value, options] = set.mock.calls[0] as unknown as [string, string, Record<string, unknown>];
    expect(name).toBe('gymsheet_installation');
    expect(value).toMatch(uuid);
    expect(options).toMatchObject({ httpOnly: true, sameSite: 'lax', path: '/', maxAge: 63_072_000 });
    const sentIds = responder.mock.calls.map(
      ([, init]) => new Headers((init as RequestInit).headers).get('X-Installation-Id'),
    );
    expect(sentIds).toEqual([value, value]);
  });

  it('reuses an existing installation cookie and always says the platform is web', async () => {
    incoming.headers.mockResolvedValue(new Headers());
    const id = '2f6d8a3e-4b1c-4d2e-9f00-1a2b3c4d5e6f';
    const { set, store } = cookieStore({ gymsheet_installation: id });
    incoming.cookies.mockResolvedValue(store);
    const sent = captureFetch();

    await backendRequest('/me/devices', { token: 't' });

    const headers = sent();
    expect(set).not.toHaveBeenCalled();
    expect(headers.get('X-Installation-Id')).toBe(id);
    expect(headers.get('X-Client-Platform')).toBe('web');
    expect(headers.get('X-App-Version')).toMatch(/^\d+\.\d+\.\d+/u);
  });

  it('replaces a tampered cookie instead of forwarding it', async () => {
    incoming.headers.mockResolvedValue(new Headers());
    const { set, store } = cookieStore({ gymsheet_installation: 'not-a-uuid\r\nX-Evil: 1' });
    incoming.cookies.mockResolvedValue(store);
    const sent = captureFetch();

    await backendRequest('/me/devices', { token: 't' });

    expect(set).toHaveBeenCalledTimes(1);
    expect(sent().get('X-Installation-Id')).toMatch(uuid);
  });

  it('leaves the id out where cookies cannot be written (Server Components)', async () => {
    incoming.headers.mockResolvedValue(new Headers());
    const store = { get: () => undefined, set: () => { throw new Error('read-only cookies'); } };
    incoming.cookies.mockResolvedValue(store);
    const sent = captureFetch();

    await backendRequest('/auth/me', { token: 't' });

    expect(sent().get('X-Installation-Id')).toBeNull();
    expect(sent().get('X-Client-Platform')).toBe('web');
  });
});
