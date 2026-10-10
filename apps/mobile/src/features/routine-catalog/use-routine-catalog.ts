import { useInfiniteQuery } from '@tanstack/react-query';
import { toCatalogQuery, type CatalogFilterState, type CatalogTab, type MineChip } from '@gymsheet/hooks';
import { routineCatalogService } from '@/api/services';

/** Claves del catálogo: invalidar `['routines', 'catalog']` refresca todas las pestañas. */
export const catalogKey = (tab: CatalogTab, chip: MineChip, filters: CatalogFilterState) =>
  ['routines', 'catalog', tab, chip, filters] as const;

/**
 * Una pestaña del catálogo con paginación por cursor. Cada combinación de
 * pestaña, chip y filtros tiene su propia caché, así que volver a una pestaña no
 * pide nada de nuevo mientras los datos estén frescos.
 */
export function useRoutineCatalog(tab: CatalogTab, chip: MineChip, filters: CatalogFilterState) {
  return useInfiniteQuery({
    queryKey: catalogKey(tab, chip, filters),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      routineCatalogService.list(toCatalogQuery(tab, chip, filters, pageParam)),
    getNextPageParam: (last) => last.siguienteCursor,
  });
}
