import { describe, expect, it } from 'vitest';
import { ApiError } from './api-error';
import { createApiClient } from './client';
import { createExerciseCommunityServices, createRoutineServices } from './routine-services';

type Call = { url: string; method: string; body: unknown };

function fakeBackend(
  reply: (call: Call) => { status?: number; body: unknown },
): { fetchImpl: typeof fetch; calls: Call[] } {
  const calls: Call[] = [];
  const fetchImpl = (async (url: string, init: RequestInit) => {
    const call: Call = {
      url,
      method: init.method ?? 'GET',
      body: typeof init.body === 'string' ? JSON.parse(init.body) : undefined,
    };
    calls.push(call);
    const { status = 200, body } = reply(call);
    return new Response(JSON.stringify(body), { status });
  }) as typeof fetch;
  return { fetchImpl, calls };
}

const ok = (data: unknown) => ({ body: { ok: true, data } });
const UUID = '8b1f6a52-3d5e-4d0b-9a63-0c8b4a5f1d11';

const routine = {
  id: UUID,
  nombre: 'QA',
  descripcion: null,
  creadoPorUsuarioId: UUID,
  visibilidad: 'PRIVATE',
  objetivo: 'HIPERTROFIA',
  estado: 'ACTIVE',
  ejercicios: [],
  dias: [{ id: UUID, diaSemana: 1, nombre: 'Empuje', orden: 1, ejercicios: [] }],
  duracionSemanas: 12,
  progresion: { activa: true, descargaCada: 4 },
  esOficial: false,
  atribucion: null,
  basadaEnRutinaId: null,
  basadaEnVersion: null,
  version: 1,
  huellaCorta: null,
  valoracion: { promedio: null, total: 0 },
  copias: 0,
  publicadaEn: null,
  estadoModeracion: 'VISIBLE',
  esMia: true,
  puedoEditar: true,
  fechaCreacion: '2026-10-08T00:00:00.000Z',
  fechaActualizacion: '2026-10-08T00:00:00.000Z',
};

describe('servicios de rutinas', () => {
  it('crea con días, reemplaza la estructura y valida la rutina devuelta', async () => {
    const { fetchImpl, calls } = fakeBackend(() => ok(routine));
    const services = createRoutineServices(createApiClient({ baseUrl: '/api', fetchImpl }).request);
    const created = await services.createWithDays({
      nombre: 'QA',
      descripcion: null,
      objetivo: 'HIPERTROFIA',
      visibilidad: 'PRIVATE',
      duracionSemanas: 12,
      progresion: { activa: true, descargaCada: 4 },
      dias: [],
    });
    expect(created.dias[0]?.nombre).toBe('Empuje');
    await services.replaceStructure(UUID, { dias: [] });
    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual([
      'POST /api/routines',
      `PUT /api/routines/${UUID}/structure`,
    ]);
    expect(calls[0]?.body).toMatchObject({ duracionSemanas: 12, progresion: { descargaCada: 4 } });
  });

  it('rechaza una rutina que no cumple el contrato', async () => {
    const { fetchImpl } = fakeBackend(() => ok({ ...routine, dias: 'no' }));
    const services = createRoutineServices(createApiClient({ baseUrl: '/api', fetchImpl }).request);
    await expect(services.get(UUID)).rejects.toMatchObject({ kind: 'contract' });
  });

  it('pide el calendario con y sin semanas, y ajusta o quita una semana', async () => {
    const calendar = { rutinaId: UUID, duracionSemanas: 12, progresion: {}, semanas: [] };
    const { fetchImpl, calls } = fakeBackend((call) =>
      call.method === 'DELETE'
        ? ok({ deleted: true })
        : call.url.includes('/weeks/')
          ? ok({ semana: 6, esDescarga: true, factorVolumen: 0.5, factorCarga: 0.9 })
          : ok(calendar),
    );
    const services = createRoutineServices(createApiClient({ baseUrl: '/api', fetchImpl }).request);
    await services.calendar(UUID);
    await services.calendar(UUID, 12);
    await services.setWeek(UUID, 6, { esDescarga: true, factorVolumen: 0.5, factorCarga: 0.9 });
    await services.clearWeek(UUID, 6);
    expect(calls.map((c) => `${c.method} ${c.url.replace(UUID, ':id')}`)).toEqual([
      'GET /api/routines/:id/calendar',
      'GET /api/routines/:id/calendar?semanas=12',
      'PUT /api/routines/:id/weeks/6',
      'DELETE /api/routines/:id/weeks/6',
    ]);
  });
});

describe('servicios de comunidad de ejercicios', () => {
  it('me gusta y quitar me gusta devuelven el contador; favorito manda isFavorite', async () => {
    const { fetchImpl, calls } = fakeBackend((call) =>
      call.url.endsWith('/preference')
        ? ok({ ejercicioId: UUID, favorito: true, valoracionPersonal: null, notas: null })
        : ok({ meGusta: call.method === 'POST', meGustaTotal: call.method === 'POST' ? 4 : 3 }),
    );
    const services = createExerciseCommunityServices(
      createApiClient({ baseUrl: '/api', fetchImpl }).request,
    );
    await expect(services.like(UUID)).resolves.toEqual({ meGusta: true, meGustaTotal: 4 });
    await expect(services.unlike(UUID)).resolves.toEqual({ meGusta: false, meGustaTotal: 3 });
    await expect(services.setFavorite(UUID, true)).resolves.toMatchObject({ favorito: true });
    expect(calls.map((c) => `${c.method} ${c.url.replace(UUID, ':id')}`)).toEqual([
      'POST /api/exercises/:id/like',
      'DELETE /api/exercises/:id/like',
      'PUT /api/me/exercises/:id/preference',
    ]);
    expect(calls[2]?.body).toEqual({ isFavorite: true });
  });
});

describe('errores con código estable', () => {
  it('propaga code y details del cuerpo de la respuesta de error', async () => {
    const { fetchImpl } = fakeBackend(() => ({
      status: 400,
      body: {
        type: 'about:blank',
        title: 'Bad Request',
        status: 400,
        detail: 'La rutina necesita al menos un día.',
        code: 'ROUTINE_HAS_NO_DAYS',
        details: { dia: 'Lunes' },
        requestId: 'r1',
      },
    }));
    const client = createApiClient({ baseUrl: '/api', fetchImpl });
    const error = await createRoutineServices(client.request)
      .replaceStructure(UUID, { dias: [] })
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 400,
      kind: 'validation',
      code: 'ROUTINE_HAS_NO_DAYS',
      details: { dia: 'Lunes' },
      requestId: 'r1',
    });
  });

  it('sin code en el cuerpo, el error no inventa uno', async () => {
    const { fetchImpl } = fakeBackend(() => ({ status: 404, body: { detail: 'Rutina no encontrada.' } }));
    const client = createApiClient({ baseUrl: '/api', fetchImpl });
    const error = await createRoutineServices(client.request).get(UUID).catch((e: unknown) => e);
    expect(error).toMatchObject({ status: 404, kind: 'not-found', message: 'Rutina no encontrada.' });
    expect((error as ApiError).code).toBeUndefined();
  });
});
