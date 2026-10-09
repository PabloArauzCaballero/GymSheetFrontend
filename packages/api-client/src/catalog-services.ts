import { routineCatalogPageSchema, routineSchema } from '@gymsheet/schemas';
import type { RoutineCatalogFilters } from '@gymsheet/schemas';
import type { RequestFn } from './routine-services';

/** Arma la query de `GET /routines`: omite lo vacío para que el backend aplique sus valores por defecto. */
export function routineCatalogQuery(filters: RoutineCatalogFilters): string {
  const params = new URLSearchParams();
  params.set('scope', filters.scope);
  if (filters.q?.trim()) params.set('q', filters.q.trim());
  if (filters.objetivo) params.set('objetivo', filters.objetivo);
  if (filters.diasPorSemana) params.set('diasPorSemana', String(filters.diasPorSemana));
  if (filters.deMiGimnasio) params.set('deMiGimnasio', 'true');
  if (filters.orden) params.set('orden', filters.orden);
  if (filters.cursor) params.set('cursor', filters.cursor);
  params.set('limit', String(filters.limit ?? 20));
  return params.toString();
}

/** Catálogo por pestañas (RF-01) y ciclo de publicación (RF-09, RF-10). */
export function createRoutineCatalogServices(request: RequestFn) {
  return {
    list: (filters: RoutineCatalogFilters) =>
      request(`/routines?${routineCatalogQuery(filters)}`, routineCatalogPageSchema, {
        method: 'GET',
      }),
    /** `409 ROUTINE_DUPLICATE` trae `details.existingRoutineId`. */
    publish: (id: string) =>
      request(`/routines/${id}/publish`, routineSchema, { method: 'POST' }),
    unpublish: (id: string) =>
      request(`/routines/${id}/unpublish`, routineSchema, { method: 'POST' }),
    copy: (id: string) => request(`/routines/${id}/copy`, routineSchema, { method: 'POST' }),
    /** Aplica la versión nueva del original a la copia (D2: nunca se hace sola). */
    syncFromSource: (id: string) =>
      request(`/routines/${id}/sync-from-source`, routineSchema, { method: 'POST' }),
  };
}

export type RoutineCatalogServices = ReturnType<typeof createRoutineCatalogServices>;
