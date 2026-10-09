import {
  routineCatalogOrders,
  trainingGoals,
  type RoutineCatalogOrder,
  type RoutineCatalogQuery,
  type TrainingGoal,
} from '@gymsheet/types';

/**
 * El estado del catálogo vive en la URL (`?tab=mias&sub=compartidas&q=…`): se
 * puede compartir, el botón Atrás de la ficha vuelve a la misma vista y no hace
 * falta guardar nada en el navegador.
 */
export const catalogTabs = ['publicas', 'repp', 'mias'] as const;
export type CatalogTab = (typeof catalogTabs)[number];
export const mineSubTabs = ['creadas', 'compartidas'] as const;
export type MineSub = (typeof mineSubTabs)[number];

export type CatalogState = {
  tab: CatalogTab;
  sub: MineSub;
  q: string;
  objetivo: TrainingGoal | null;
  dias: number | null;
  gym: boolean;
  orden: RoutineCatalogOrder;
};

export const DEFAULT_ORDER: RoutineCatalogOrder = 'populares';

export const defaultCatalogState: CatalogState = {
  tab: 'publicas',
  sub: 'creadas',
  q: '',
  objetivo: null,
  dias: null,
  gym: false,
  orden: DEFAULT_ORDER,
};

type Params = { get(name: string): string | null };

function pick<T extends string>(value: string | null, allowed: readonly T[]): T | null {
  return allowed.find((candidate) => candidate === value) ?? null;
}

export function parseCatalogState(params: Params): CatalogState {
  const dias = Number(params.get('dias'));
  return {
    tab: pick(params.get('tab'), catalogTabs) ?? defaultCatalogState.tab,
    sub: pick(params.get('sub'), mineSubTabs) ?? defaultCatalogState.sub,
    q: (params.get('q') ?? '').slice(0, 80),
    objetivo: pick(params.get('objetivo'), trainingGoals),
    dias: Number.isInteger(dias) && dias >= 1 && dias <= 7 ? dias : null,
    gym: params.get('gym') === '1',
    orden: pick(params.get('orden'), routineCatalogOrders) ?? DEFAULT_ORDER,
  };
}

/** Solo lo que se aparta de los valores por omisión, para que la URL se quede corta. */
export function catalogSearch(state: CatalogState): string {
  const params = new URLSearchParams();
  if (state.tab !== defaultCatalogState.tab) params.set('tab', state.tab);
  if (state.tab === 'mias' && state.sub !== defaultCatalogState.sub) params.set('sub', state.sub);
  if (state.q.trim()) params.set('q', state.q.trim());
  if (state.objetivo) params.set('objetivo', state.objetivo);
  if (state.dias) params.set('dias', String(state.dias));
  if (state.gym) params.set('gym', '1');
  if (state.orden !== DEFAULT_ORDER) params.set('orden', state.orden);
  return params.toString();
}

/** Qué le pedimos al servidor para esta pestaña. */
export function toCatalogQuery(state: CatalogState): Omit<RoutineCatalogQuery, 'cursor'> {
  const scope = state.tab === 'publicas' ? 'public' : state.tab === 'repp' ? 'official' : state.sub === 'compartidas' ? 'shared' : 'mine';
  const publicTab = state.tab === 'publicas';
  return {
    scope,
    ...(state.q.trim() ? { q: state.q.trim() } : {}),
    ...(state.objetivo ? { objetivo: state.objetivo } : {}),
    ...(state.dias ? { diasPorSemana: state.dias } : {}),
    // «De mi gimnasio» solo tiene sentido entre las públicas.
    ...(publicTab && state.gym ? { deMiGimnasio: true } : {}),
    orden: publicTab ? state.orden : 'recientes',
    limit: 12,
  };
}

/** Cuántos filtros están puestos (el buscador cuenta). El orden no es un filtro. */
export function activeFilterCount(state: CatalogState): number {
  return (
    (state.q.trim() ? 1 : 0) +
    (state.objetivo ? 1 : 0) +
    (state.dias ? 1 : 0) +
    (state.tab === 'publicas' && state.gym ? 1 : 0)
  );
}

export function clearFilters(state: CatalogState): CatalogState {
  return { ...state, q: '', objetivo: null, dias: null, gym: false };
}
