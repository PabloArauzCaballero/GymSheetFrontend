import { describe, expect, it } from 'vitest';
import { DEFAULT_MARKETPLACE_FILTERS, filterPlans, hasActiveFilters } from './marketplace-categories';

const plan = (name: string, price: string, type: string, rating: number, path = 'tiendas.nutricion') => ({
  type,
  name,
  description: '',
  currentPrice: price,
  entity: { entityType: 'STORE', name: 'T', ratingAverage: rating, isVerified: true, primaryCategory: { path } },
});

describe('filterPlans', () => {
  const items = [plan('A', '30', 'PRODUCT', 4.8), plan('B', '10', 'PRODUCT', 4.1), plan('C', '20', 'PASS', 4.9, 'gimnasios')];
  it('ordena por precio y filtra por puntaje', () => {
    expect(filterPlans(items, { ...DEFAULT_MARKETPLACE_FILTERS, sort: 'price-asc' }).map((p) => p.name)).toEqual(['B', 'C', 'A']);
    expect(filterPlans(items, { ...DEFAULT_MARKETPLACE_FILTERS, topRated: true }).map((p) => p.name)).toEqual(['A', 'C']);
  });
  it('filtra por categoría de vendedor', () => {
    expect(filterPlans(items, { ...DEFAULT_MARKETPLACE_FILTERS, category: 'supplements' }).map((p) => p.name)).toEqual(['A', 'B']);
    expect(hasActiveFilters(DEFAULT_MARKETPLACE_FILTERS)).toBe(false);
  });
});
