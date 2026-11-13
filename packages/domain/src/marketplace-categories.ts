/**
 * Marketplace: categorías, orden y filtros compartidos por móvil y web.
 * Una sola lista (antes estaba duplicada en cada app) y una sola función de
 * filtrado/orden, para que las dos muestren lo mismo con los mismos criterios.
 */

export type MarketplaceCategoryId =
  | 'all'
  | 'gyms'
  | 'supplements'
  | 'apparel'
  | 'equipment'
  | 'coaches'
  | 'centers'
  | 'passes';

export type MarketplaceCategory = {
  id: MarketplaceCategoryId;
  label: string;
  /** Tipo de ente del backend, si la categoría lo fija. */
  entityType?: 'GYM' | 'STORE' | 'COACH' | 'CENTER';
  /** Ruta de categoría del backend (`category_path`, por prefijo). */
  path?: string;
  /** Tipos de plan que entran en «Ofertas»; vacío = todos. */
  planTypes?: ReadonlyArray<'MEMBERSHIP_PLAN' | 'PASS' | 'SERVICE' | 'PRODUCT'>;
};

export const MARKETPLACE_CATEGORIES: readonly MarketplaceCategory[] = [
  { id: 'all', label: 'Todo' },
  { id: 'gyms', label: 'Gimnasios', entityType: 'GYM', path: 'gimnasios', planTypes: ['MEMBERSHIP_PLAN', 'PASS'] },
  { id: 'supplements', label: 'Suplementos', entityType: 'STORE', path: 'tiendas.nutricion' },
  { id: 'apparel', label: 'Indumentaria', entityType: 'STORE', path: 'tiendas.indumentaria' },
  { id: 'equipment', label: 'Equipamiento', entityType: 'STORE', path: 'tiendas.equipamiento' },
  { id: 'coaches', label: 'Coaches', entityType: 'COACH', path: 'coaches', planTypes: ['SERVICE'] },
  { id: 'centers', label: 'Centros', entityType: 'CENTER', path: 'centros' },
  { id: 'passes', label: 'Pases', planTypes: ['PASS', 'MEMBERSHIP_PLAN'] },
];

export type MarketplaceSort = 'relevance' | 'rating' | 'price-asc' | 'price-desc';

export const MARKETPLACE_SORTS: ReadonlyArray<{ id: MarketplaceSort; label: string }> = [
  { id: 'relevance', label: 'Relevancia' },
  { id: 'rating', label: 'Mejor puntaje' },
  { id: 'price-asc', label: 'Precio: menor a mayor' },
  { id: 'price-desc', label: 'Precio: mayor a menor' },
];

export const MARKETPLACE_TOP_RATING = 4.5;

export type MarketplaceFilters = {
  category: MarketplaceCategoryId;
  sort: MarketplaceSort;
  /** Solo vendedores con puntaje ≥ 4.5. */
  topRated: boolean;
  verifiedOnly: boolean;
  search: string;
};

export const DEFAULT_MARKETPLACE_FILTERS: MarketplaceFilters = {
  category: 'all',
  sort: 'relevance',
  topRated: false,
  verifiedOnly: false,
  search: '',
};

type Seller = { ratingAverage?: number | null; isVerified?: boolean; name?: string; primaryCategory?: { path: string } };

export function categoryById(id: MarketplaceCategoryId): MarketplaceCategory {
  return MARKETPLACE_CATEGORIES.find((category) => category.id === id) ?? MARKETPLACE_CATEGORIES[0]!;
}

function pathMatches(actual: string | undefined, wanted: string): boolean {
  return Boolean(actual && (actual === wanted || actual.startsWith(`${wanted}.`)));
}

function matchesSeller(seller: Seller | undefined, filters: MarketplaceFilters): boolean {
  if (filters.topRated && (seller?.ratingAverage ?? 0) < MARKETPLACE_TOP_RATING) return false;
  if (filters.verifiedOnly && !seller?.isVerified) return false;
  return true;
}

/** Tiendas/entes: categoría por tipo y ruta, puntaje, verificados y búsqueda. */
export function filterEntities<T extends Seller & { entityType: string; headline?: string | null; city?: string | null }>(
  items: readonly T[],
  filters: MarketplaceFilters,
): T[] {
  const category = categoryById(filters.category);
  const query = filters.search.trim().toLowerCase();
  const result = items.filter((item) => {
    if (category.entityType && item.entityType !== category.entityType) return false;
    if (category.path && !pathMatches(item.primaryCategory?.path, category.path) && item.entityType === 'STORE') {
      // Una tienda sin la subcategoría pedida no es de esta categoría.
      return false;
    }
    if (!matchesSeller(item, filters)) return false;
    if (query) {
      const hay = `${item.name ?? ''} ${item.headline ?? ''} ${item.city ?? ''}`.toLowerCase();
      if (!hay.includes(query)) return false;
    }
    return true;
  });
  if (filters.sort === 'rating') return [...result].sort((a, b) => (b.ratingAverage ?? 0) - (a.ratingAverage ?? 0));
  return result;
}

/** Ofertas (planes): categoría por tipo de plan y vendedor, puntaje del vendedor y búsqueda. */
export function filterPlans<
  T extends { type: string; name: string; description: string; currentPrice: string; entity?: (Seller & { entityType: string }) | undefined },
>(items: readonly T[], filters: MarketplaceFilters): T[] {
  const category = categoryById(filters.category);
  const query = filters.search.trim().toLowerCase();
  const result = items.filter((plan) => {
    if (category.planTypes && category.id !== 'all') {
      const byType = category.planTypes.includes(plan.type as never);
      const bySeller = category.path ? pathMatches(plan.entity?.primaryCategory?.path, category.path) : false;
      if (!byType && !bySeller) return false;
    } else if (category.path && category.id !== 'all') {
      if (!pathMatches(plan.entity?.primaryCategory?.path, category.path)) return false;
    }
    if (!matchesSeller(plan.entity, filters)) return false;
    if (query) {
      const hay = `${plan.name} ${plan.description} ${plan.entity?.name ?? ''}`.toLowerCase();
      if (!hay.includes(query)) return false;
    }
    return true;
  });
  const price = (plan: T) => Number.parseFloat(plan.currentPrice) || 0;
  if (filters.sort === 'price-asc') return [...result].sort((a, b) => price(a) - price(b));
  if (filters.sort === 'price-desc') return [...result].sort((a, b) => price(b) - price(a));
  if (filters.sort === 'rating') {
    return [...result].sort((a, b) => (b.entity?.ratingAverage ?? 0) - (a.entity?.ratingAverage ?? 0));
  }
  return result;
}

/** ¿Hay algo distinto del estado de fábrica? Para el «Borrar filtros». */
export function hasActiveFilters(filters: MarketplaceFilters): boolean {
  return (
    filters.category !== 'all' || filters.sort !== 'relevance' || filters.topRated || filters.verifiedOnly || filters.search.trim() !== ''
  );
}
