import { describe, expect, it, vi } from 'vitest';
import { accessTokenExpiry, createSessionRefresher, type AuthStorage } from '@gymsheet/auth';

function memoryStorage(initial: { access?: string; refresh?: string } = {}) {
  const state = { access: initial.access ?? null, refresh: initial.refresh ?? null } as {
    access: string | null;
    refresh: string | null;
  };
  const storage: AuthStorage = {
    getAccessToken: async () => state.access,
    getRefreshToken: async () => state.refresh,
    saveTokens: async (access, refresh) => {
      state.access = access;
      state.refresh = refresh;
    },
    clearTokens: async () => {
      state.access = null;
      state.refresh = null;
    },
  };
  return { storage, state };
}

const rejection = (status: number) => Object.assign(new Error('rejected'), { status });
const isRejection = (error: unknown) =>
  [400, 401, 403].includes((error as { status?: number }).status ?? 0);

describe('createSessionRefresher', () => {
  it('stores the rotated pair', async () => {
    const { storage, state } = memoryStorage({ access: 'a1', refresh: 'r1' });
    const refresher = createSessionRefresher({
      storage,
      exchange: async () => ({ accessToken: 'a2', refreshToken: 'r2' }),
      isRejection,
    });

    await expect(refresher.refresh()).resolves.toBe('refreshed');
    expect(state).toEqual({ access: 'a2', refresh: 'r2' });
  });

  it('parallel callers share ONE exchange (the server revokes a reused token)', async () => {
    const { storage } = memoryStorage({ refresh: 'r1' });
    const exchange = vi.fn(async () => ({ accessToken: 'a2', refreshToken: 'r2' }));
    const refresher = createSessionRefresher({ storage, exchange, isRejection });

    const outcomes = await Promise.all([refresher.refresh(), refresher.refresh(), refresher.refresh()]);

    expect(exchange).toHaveBeenCalledTimes(1);
    expect(outcomes).toEqual(['refreshed', 'refreshed', 'refreshed']);
    await refresher.refresh();
    expect(exchange).toHaveBeenCalledTimes(2);
  });

  it('without signal keeps the session', async () => {
    const { storage, state } = memoryStorage({ access: 'a1', refresh: 'r1' });
    const refresher = createSessionRefresher({
      storage,
      exchange: async () => {
        throw new TypeError('Network request failed');
      },
      isRejection,
    });

    await expect(refresher.refresh()).resolves.toBe('unavailable');
    expect(state.refresh).toBe('r1');
  });

  it('a server rejection ends the session and clears the tokens', async () => {
    const { storage, state } = memoryStorage({ access: 'a1', refresh: 'r1' });
    const refresher = createSessionRefresher({
      storage,
      exchange: async () => {
        throw rejection(401);
      },
      isRejection,
    });

    await expect(refresher.refresh()).resolves.toBe('rejected');
    expect(state).toEqual({ access: null, refresh: null });
  });

  it('with no refresh token there is nothing to renew', async () => {
    const exchange = vi.fn();
    const refresher = createSessionRefresher({ storage: memoryStorage().storage, exchange, isRejection });
    await expect(refresher.refresh()).resolves.toBe('rejected');
    expect(exchange).not.toHaveBeenCalled();
  });
});

describe('accessTokenExpiry', () => {
  const jwt = (payload: object) =>
    `${btoa('{"alg":"HS256"}')}.${btoa(JSON.stringify(payload)).replace(/=+$/u, '').replace(/\+/gu, '-').replace(/\//gu, '_')}.sig`;

  it('reads exp from a JWT', () => {
    expect(accessTokenExpiry(jwt({ sub: 'u1', exp: 1_900_000_000 }))).toBe(1_900_000_000);
  });

  it('returns null for an unreadable token', () => {
    expect(accessTokenExpiry('not-a-jwt')).toBeNull();
    expect(accessTokenExpiry('a.@@@.c')).toBeNull();
    expect(accessTokenExpiry(jwt({ sub: 'u1' }))).toBeNull();
  });
});
