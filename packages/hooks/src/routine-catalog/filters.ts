import type {
  RoutineCatalogOrder,
  RoutineCatalogQuery,
  RoutineCatalogScope,
  TrainingGoal,
} from '@gymsheet/types';

/** Lo que la persona puede cambiar en la barra de filtros del catálogo. */
export type CatalogFilterState = {
  q: string;
  objetivo: TrainingGoal | null;
  diasPorSemana: number | null;
  deMiGimnasio: boolean;
  orden: RoutineCatalogOrder;
};

export const emptyCatalogFilters: CatalogFilterState = {
  q: '',
  objetivo: null,
  diasPorSemana: null,
  deMiGimnasio: false,
  orden: 'populares',
};

export const ORDER_LABELS: Record<RoutineCatalogOrder, string> = {
  populares: 'Populares',
  recientes: 'Recientes',
  valoradas: 'Mejor valoradas',
};

export const CATALOG_TABS = [
  { scope: 'all', label: 'Todas' },
  { scope: 'official', label: 'REPP' },
  { scope: 'shared', label: 'Compartidas' },
] as const satisfies readonly { scope: RoutineCatalogScope; label: string }[];

export type CatalogTab = (typeof CATALOG_TABS)[number]['scope'];

/** Cuántos filtros (sin contar el buscador ni el orden) están aplicados. */
export function activeFilterCount(state: CatalogFilterState): number {
  return (
    (state.objetivo ? 1 : 0) + (state.diasPorSemana ? 1 : 0) + (state.deMiGimnasio ? 1 : 0)
  );
}

export function hasActiveFilters(state: CatalogFilterState): boolean {
  return activeFilterCount(state) > 0 || state.q.trim().length > 0;
}

/**
 * Traduce la pestaña y los filtros a la consulta del backend. «Todas» mezcla lo
 * público con lo que creé yo; REPP y Compartidas van aparte. Los filtros solo se
 * envían desde «Todas»: las demás pestañas no los muestran.
 */
export function toCatalogQuery(
  tab: CatalogTab,
  state: CatalogFilterState,
  cursor?: string | null,
): RoutineCatalogQuery {
  const filtered = tab === 'all';
  return {
    scope: tab,
    q: state.q.trim() || undefined,
    objetivo: filtered ? (state.objetivo ?? undefined) : undefined,
    diasPorSemana: filtered ? (state.diasPorSemana ?? undefined) : undefined,
    deMiGimnasio: filtered && state.deMiGimnasio ? true : undefined,
    orden: filtered ? state.orden : undefined,
    cursor: cursor ?? undefined,
  };
}
