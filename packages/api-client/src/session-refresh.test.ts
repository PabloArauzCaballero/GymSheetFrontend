import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { ApiError } from './api-error';
import { createApiClient } from './client';

const unauthorized = () =>
  new Response(JSON.stringify({ ok: false, detail: 'Sesión inválida.' }), { status: 401 });

function clientWith(refreshSession: () => Promise<boolean>) {
  const onUnauthorized = vi.fn();
  const client = createApiClient({
    baseUrl: 'https://api.test',
    fetchImpl: (async () => unauthorized()) as typeof fetch,
    tokenProvider: {
      getAccessToken: async () => 'caducado',
      setAccessToken: async () => {},
      clear: async () => {},
    },
    refreshSession,
    onUnauthorized,
  });
  return { client, onUnauthorized };
}

describe('renovación de sesión tras un 401', () => {
  it('cierra la sesión sólo si el servidor rechazó el refresh', async () => {
    const { client, onUnauthorized } = clientWith(async () => false);
    await expect(client.request('/auth/me', z.unknown())).rejects.toMatchObject({
      kind: 'unauthorized',
    });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('sin red al renovar falla la petición pero conserva la sesión', async () => {
    const { client, onUnauthorized } = clientWith(async () => {
      throw new ApiError({ message: 'Sin conexión.', status: 0, kind: 'network' });
    });
    await expect(client.request('/auth/me', z.unknown())).rejects.toMatchObject({
      kind: 'network',
    });
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('un fallo que no es ApiError sigue contando como sesión perdida', async () => {
    const { client, onUnauthorized } = clientWith(async () => {
      throw new Error('inesperado');
    });
    await expect(client.request('/auth/me', z.unknown())).rejects.toBeInstanceOf(ApiError);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });
});

describe('cuenta suspendida (401 ACCOUNT_SUSPENDED)', () => {
  const suspended = () =>
    new Response(
      JSON.stringify({
        code: 'ACCOUNT_SUSPENDED',
        detail: 'Tu cuenta está suspendida mientras revisamos un reporte.',
        details: { pendingReview: true },
      }),
      { status: 401 },
    );

  it('no renueva ni cierra como sesión caducada: rechaza con el código y avisa una vez', async () => {
    const fetchImpl = vi.fn(async () => suspended());
    const refreshSession = vi.fn(async () => true);
    const onUnauthorized = vi.fn();
    const onAccountSuspended = vi.fn();
    const client = createApiClient({
      baseUrl: 'https://api.test',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      refreshSession,
      onUnauthorized,
      onAccountSuspended,
    });
    await expect(client.request('/auth/me', z.unknown())).rejects.toMatchObject({
      code: 'ACCOUNT_SUSPENDED',
      details: { pendingReview: true },
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(refreshSession).not.toHaveBeenCalled();
    expect(onUnauthorized).not.toHaveBeenCalled();
    expect(onAccountSuspended).toHaveBeenCalledTimes(1);
  });
});
