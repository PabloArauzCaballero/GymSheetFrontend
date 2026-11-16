import { describe, expect, it } from 'vitest';
import { createApiClient } from './client';
import { createMyReportServices } from './moderation-services';

const ID = '8b1f6a52-3d5e-4d0b-9a63-0c8b4a5f1d11';

function backend(data: unknown) {
  const calls: string[] = [];
  const fetchImpl = (async (url: string, init: RequestInit) => {
    calls.push(`${init.method ?? 'GET'} ${url}`);
    return new Response(JSON.stringify({ ok: true, data }), { status: 200 });
  }) as typeof fetch;
  return { calls, services: createMyReportServices(createApiClient({ baseUrl: '/api', fetchImpl }).request) };
}

describe('«Tus denuncias»', () => {
  it('lista con límite y cursor, y tolera un tipo o estado que este cliente aún no conoce', async () => {
    const { calls, services } = backend({
      items: [
        { id: ID, targetKind: 'ROUTINE', targetId: ID, title: 'Pierna', ownerName: 'Ana', reason: 'SPAM', status: 'EN_REVISION', createdAt: '2026-11-16T10:00:00.123456Z' },
        { id: ID, targetKind: 'FUTURE_KIND', targetId: ID, title: null, ownerName: 'Leo', reason: 'OTRO', status: 'NUEVO', createdAt: '2026-11-15T10:00:00Z' },
      ],
      nextCursor: 'abc',
    });
    const page = await services.list('c1', 10);
    expect(calls).toEqual(['GET /api/me/reports?limit=10&cursor=c1']);
    expect(page.items[1]).toMatchObject({ targetKind: 'FUTURE_KIND', status: 'EN_REVISION' });
    expect(page.nextCursor).toBe('abc');
  });

  it('retira con POST /me/reports/:id/withdraw y valida la respuesta', async () => {
    const { calls, services } = backend({ id: ID, withdrawn: true, withdrawnAt: '2026-11-16T10:00:00Z', contentRestored: false });
    const result = await services.withdraw(ID);
    expect(calls).toEqual([`POST /api/me/reports/${ID}/withdraw`]);
    expect(result.withdrawn).toBe(true);
  });

  it('denuncia con POST /me/reports', async () => {
    const { calls, services } = backend({ id: ID, status: 'PENDIENTE', contentHidden: false });
    expect((await services.report({ targetKind: 'USER', targetId: ID, reason: 'ACOSO' })).id).toBe(ID);
    expect(calls).toEqual(['POST /api/me/reports']);
  });
});
