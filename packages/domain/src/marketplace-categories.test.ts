import { describe, expect, it } from 'vitest';
import { DEFAULT_MARKETPLACE_FILTERS, MARKETPLACE_CATEGORIES, categoryById, filterEntities, hasActiveFilters } from './marketplace-categories';

const seller = (name: string, entityType: string, rating: number, path = 'tiendas.nutricion', isVerified = true) => ({
  name,
  entityType,
  ratingAverage: rating,
  isVerified,
  primaryCategory: { path },
});

describe('filterEntities', () => {
  const items = [seller('A', 'STORE', 4.8), seller('B', 'STORE', 4.1, 'tiendas.indumentaria', false), seller('C', 'GYM', 4.9, 'gimnasios')];
  it('filtra por categoría, puntaje y verificados', () => {
    expect(filterEntities(items, { ...DEFAULT_MARKETPLACE_FILTERS, category: 'supplements' }).map((s) => s.name)).toEqual(['A']);
    expect(filterEntities(items, { ...DEFAULT_MARKETPLACE_FILTERS, topRated: true }).map((s) => s.name)).toEqual(['A', 'C']);
    expect(filterEntities(items, { ...DEFAULT_MARKETPLACE_FILTERS, verifiedOnly: true }).map((s) => s.name)).toEqual(['A', 'C']);
    expect(filterEntities(items, { ...DEFAULT_MARKETPLACE_FILTERS, sort: 'rating' }).map((s) => s.name)).toEqual(['C', 'A', 'B']);
    expect(hasActiveFilters(DEFAULT_MARKETPLACE_FILTERS)).toBe(false);
  });
});

describe('categories aligned with offerKind (ADR-0022)', () => {
  it('fixes a seller type or an offer kind, never a legacy plan type', () => {
    expect(categoryById('passes').offerKind).toBe('DAY_PASS');
    expect(categoryById('gyms').entityType).toBe('GYM');
    expect(MARKETPLACE_CATEGORIES.every((category) => !('planTypes' in category))).toBe(true);
  });
});
