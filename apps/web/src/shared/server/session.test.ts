import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  backendRequest: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT ${path}`);
  }),
}));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => ({ name: 'session', value: 'token-de-cuenta-suspendida' }) }),
}));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));
vi.mock('./backend', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./backend')>()),
  backendRequest: mocks.backendRequest,
}));

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('requireSession with a suspended account', () => {
  // The first import transforms the whole server module graph; doing it in the
  // test body made the test time out on a loaded machine.
  beforeAll(async () => {
    await import('./session');
  });
  beforeEach(() => vi.clearAllMocks());

  it('logs out to login with the suspension instead of «sesión expirada»', async () => {
    mocks.backendRequest.mockImplementation(async () =>
      json(401, {
        code: 'ACCOUNT_SUSPENDED',
        detail: 'Tu cuenta está suspendida mientras revisamos un reporte.',
        details: {
          pendingReview: true,
          reason: { code: 'MENOR_DE_EDAD', label: 'Menor de edad', text: 'la cuenta parece ser de una persona menor de 18 años' },
        },
      }),
    );
    const { requireSession } = await import('./session');
    // Only the reason code travels; its words never reach the URL.
    await expect(requireSession()).rejects.toThrow(
      'REDIRECT /api/auth/logout?returnTo=%2Flogin%3Fsuspended%3Dreview%26reason%3DMENOR_DE_EDAD',
    );
    expect(mocks.redirect).toHaveBeenCalledTimes(1);
    expect(String(mocks.redirect.mock.calls[0]?.[0])).not.toMatch(/Menor|menor/u);
  });

  it('keeps the plain logout for a token that is simply no longer valid', async () => {
    vi.resetModules();
    mocks.backendRequest.mockImplementation(async () => json(401, { detail: 'Sesión inválida.' }));
    const { requireSession } = await import('./session');
    await expect(requireSession()).rejects.toThrow('REDIRECT /api/auth/logout?returnTo=/login');
  });
});
