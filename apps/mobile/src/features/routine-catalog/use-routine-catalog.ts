import { useInfiniteQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import type { RoutineCard, RoutineRecommendation } from '@gymsheet/types';
import { toCatalogQuery, type CatalogFilterState, type CatalogTab } from '@gymsheet/hooks';
import { routineCatalogService } from '@/api/services';

/** Claves del catálogo: invalidar `['routines', 'catalog']` refresca todas las pestañas. */
export const catalogKey = (tab: CatalogTab, filters: CatalogFilterState) =>
  ['routines', 'catalog', tab, filters] as const;

/**
 * Una pestaña del catálogo con paginación por cursor. Cada combinación de
 * pestaña, chip y filtros tiene su propia caché, así que volver a una pestaña no
 * pide nada de nuevo mientras los datos estén frescos.
 */
export function useRoutineCatalog(tab: CatalogTab, filters: CatalogFilterState) {
  return useInfiniteQuery({
    queryKey: catalogKey(tab, filters),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      routineCatalogService.list(toCatalogQuery(tab, filters, pageParam)),
    getNextPageParam: (last) => last.siguienteCursor,
  });
}

/**
 * La tarjeta de una rutina tal como está en la caché del catálogo (cualquier
 * pestaña o filtro) o en «Para ti». Sirve para pintar el detalle al instante
 * con lo que ya se veía, sin pedir nada. `null` si se llegó por otro camino.
 */
export function useCatalogCard(id: string | undefined): RoutineCard | null {
  const queryClient = useQueryClient();
  if (!id) return null;
  const lists = queryClient.getQueriesData<InfiniteData<{ items: RoutineCard[] }>>({ queryKey: ['routines', 'catalog'] });
  for (const [, data] of lists) {
    for (const page of data?.pages ?? []) {
      const found = page.items.find((item) => item.id === id);
      if (found) return found;
    }
  }
  // «Para ti»: una lista plana de `{ rutina, motivo }`.
  const recommended = queryClient.getQueriesData<readonly RoutineRecommendation[]>({
    queryKey: ['routines', 'recommended'],
  });
  for (const [, data] of recommended) {
    const found = data?.find((item) => item.rutina.id === id);
    if (found) return found.rutina;
  }
  return null;
}
