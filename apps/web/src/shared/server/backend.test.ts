import { afterEach, describe, expect, it, vi } from 'vitest';
import { backendRequest, clientForwardingHeaders } from './backend';

const incoming = vi.hoisted(() => {
  // One trusted proxy in front of Next, as in production; must be set before env.ts parses it.
  process.env.TRUSTED_PROXY_HOPS = '1';
  return { headers: vi.fn() };
});
vi.mock('next/headers', () => ({ headers: incoming.headers }));

function captureFetch() {
  const responder = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
  vi.stubGlobal('fetch', responder);
  return () => new Headers((responder.mock.calls[0]?.[1] as RequestInit).headers);
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
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
