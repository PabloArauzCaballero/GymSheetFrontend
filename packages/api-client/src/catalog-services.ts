import { routineCatalogPageSchema } from '@gymsheet/schemas';
import type { RoutineCatalogQuery } from '@gymsheet/types';
import type { RequestFn } from './routine-services';

/** Query string de `GET /routines?scope=…`: solo lo que tiene valor, para no mandar ruido al servidor. */
export function routineCatalogQueryString(query: RoutineCatalogQuery): string {
  const params = new URLSearchParams();
  params.set('scope', query.scope);
  if (query.q?.trim()) params.set('q', query.q.trim());
  if (query.objetivo) params.set('objetivo', query.objetivo);
  if (query.diasPorSemana) params.set('diasPorSemana', String(query.diasPorSemana));
  if (query.deMiGimnasio) params.set('deMiGimnasio', 'true');
  if (query.orden) params.set('orden', query.orden);
  if (query.cursor) params.set('cursor', query.cursor);
  params.set('limit', String(query.limit ?? 20));
  return params.toString();
}

/** Catálogo de rutinas por pestañas (RF-01): `{ items, siguienteCursor }` con cursor opaco. */
export function createCatalogServices(request: RequestFn) {
  return {
    list: (query: RoutineCatalogQuery) =>
      request(`/routines?${routineCatalogQueryString(query)}`, routineCatalogPageSchema, {
        method: 'GET',
      }),
  };
}

export type CatalogServices = ReturnType<typeof createCatalogServices>;
