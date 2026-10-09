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
  { scope: 'public', label: 'Públicas' },
  { scope: 'official', label: 'REPP' },
  { scope: 'mine', label: 'Mías' },
] as const satisfies readonly { scope: RoutineCatalogScope; label: string }[];

export type CatalogTab = (typeof CATALOG_TABS)[number]['scope'];

/** Chips de «Mías»: lo que creé yo o lo que me compartieron. */
export type MineChip = 'created' | 'shared';

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
 * Traduce la pestaña, el chip de «Mías» y los filtros a la consulta del backend.
 * «Creadas por mí» es `scope=mine`; «Compartidas conmigo» es `scope=shared`. Los
 * filtros de Públicas no se envían a las demás pestañas: no los muestran.
 */
export function toCatalogQuery(
  tab: CatalogTab,
  chip: MineChip,
  state: CatalogFilterState,
  cursor?: string | null,
): RoutineCatalogQuery {
  const scope: RoutineCatalogScope = tab === 'mine' ? (chip === 'shared' ? 'shared' : 'mine') : tab;
  const filtered = tab === 'public';
  return {
    scope,
    q: state.q.trim() || undefined,
    objetivo: filtered ? (state.objetivo ?? undefined) : undefined,
    diasPorSemana: filtered ? (state.diasPorSemana ?? undefined) : undefined,
    deMiGimnasio: filtered && state.deMiGimnasio ? true : undefined,
    orden: filtered ? state.orden : undefined,
    cursor: cursor ?? undefined,
  };
}
