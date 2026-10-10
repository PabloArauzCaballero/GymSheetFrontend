import { describe, expect, it } from 'vitest';
import { createApiClient } from './client';
import { createRecommendationServices } from './recommendation-services';

const UUID = '8b1f6a52-3d5e-4d0b-9a63-0c8b4a5f1d11';

const card = {
  id: UUID,
  nombre: 'Torso-Pierna 4 días',
  descripcion: null,
  objetivo: 'HIPERTROFIA',
  duracionSemanas: 8,
  diasPorSemana: 4,
  ejerciciosTotal: 22,
  visibilidad: 'PUBLIC',
  esOficial: true,
  esMia: false,
  autor: { id: UUID, nombre: 'REPP' },
  atribucion: null,
  valoracion: { promedio: 4.7, total: 18 },
  copias: 41,
  publicadaEn: '2026-10-01T00:00:00.000Z',
  version: 1,
  estadoModeracion: 'VISIBLE',
  dias: [{ diaSemana: 1, nombre: 'Torso A', ejerciciosTotal: 6 }],
  invitacion: null,
};

function backend(data: unknown, status = 200) {
  const calls: string[] = [];
  const fetchImpl = (async (url: string, init: RequestInit) => {
    calls.push(`${init.method ?? 'GET'} ${url}`);
    return new Response(JSON.stringify(status === 200 ? { ok: true, data } : data), { status });
  }) as typeof fetch;
  return { calls, services: createRecommendationServices(createApiClient({ baseUrl: '/api', fetchImpl }).request) };
}

describe('recomendaciones (C7)', () => {
  it('pide GET /routines/recommended?limit=3 por defecto y valida rutina + motivo', async () => {
    const motivo = 'Porque elegiste Hipertrofia · 4 días · gimnasio';
    const { calls, services } = backend([{ rutina: card, motivo, plantilla: 'hipertrofia-torso-pierna-4d' }]);
    const list = await services.recommended();
    expect(calls).toEqual(['GET /api/routines/recommended?limit=3']);
    expect(list).toHaveLength(1);
    expect(list[0]?.rutina.nombre).toBe('Torso-Pierna 4 días');
    expect(list[0]?.motivo).toBe(motivo);
    expect(list[0]?.plantilla).toBe('hipertrofia-torso-pierna-4d');
  });

  it('respeta el límite pedido y lo normaliza a entero ≥ 1', async () => {
    const { calls, services } = backend([]);
    await services.recommended(5);
    await services.recommended(0);
    await services.recommended(2.7);
    expect(calls).toEqual([
      'GET /api/routines/recommended?limit=5',
      'GET /api/routines/recommended?limit=1',
      'GET /api/routines/recommended?limit=2',
    ]);
  });

  it('descarta la recomendación que no cumple el contrato sin tumbar las demás', async () => {
    const { services } = backend([
      { rutina: card, motivo: 'Para ti' }, // sin `plantilla`: es opcional
      { rutina: { id: 'roto' }, motivo: 'x' },
      { motivo: 'sin rutina' },
    ]);
    const list = await services.recommended();
    expect(list.map((item) => item.motivo)).toEqual(['Para ti']);
  });

  it('una respuesta que no es una lista es un error', async () => {
    const { services } = backend({ items: [] });
    await expect(services.recommended()).rejects.toBeTruthy();
  });

  it('un 404 (servidor sin el endpoint todavía) llega como error de «no encontrado»', async () => {
    const { services } = backend(
      { type: 'about:blank', title: 'Not Found', status: 404, detail: 'Cannot GET' },
      404,
    );
    await expect(services.recommended()).rejects.toMatchObject({ kind: 'not-found' });
  });
});
