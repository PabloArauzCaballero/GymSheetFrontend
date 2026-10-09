import { describe, expect, it } from 'vitest';
import {
  activeFilterCount,
  catalogSearch,
  clearFilters,
  defaultCatalogState,
  parseCatalogState,
  toCatalogQuery,
} from './catalog-state';

const parse = (search: string) => parseCatalogState(new URLSearchParams(search));

describe('estado del catálogo en la URL', () => {
  it('arranca en Públicas, ordenadas por popularidad y sin filtros', () => {
    expect(parse('')).toEqual(defaultCatalogState);
  });

  it('ignora valores que no son del catálogo', () => {
    const state = parse('tab=otra&objetivo=BOGUS&dias=9&orden=azar&sub=x');
    expect(state).toEqual(defaultCatalogState);
  });

  it('va y vuelve sin perder nada', () => {
    const original = parse('tab=mias&sub=compartidas&q=empuje&objetivo=FUERZA&dias=4&orden=valoradas');
    expect(parse(catalogSearch(original))).toEqual({ ...original, orden: 'valoradas' });
  });

  it('deja la URL vacía cuando todo es lo de siempre', () => {
    expect(catalogSearch(defaultCatalogState)).toBe('');
  });

  it('pide al servidor el alcance de cada pestaña', () => {
    expect(toCatalogQuery(parse('')).scope).toBe('public');
    expect(toCatalogQuery(parse('tab=repp')).scope).toBe('official');
    expect(toCatalogQuery(parse('tab=mias')).scope).toBe('mine');
    expect(toCatalogQuery(parse('tab=mias&sub=compartidas')).scope).toBe('shared');
  });

  it('manda «de mi gimnasio» y el orden elegido solo en Públicas', () => {
    const publicas = toCatalogQuery(parse('gym=1&orden=valoradas'));
    expect(publicas).toMatchObject({ deMiGimnasio: true, orden: 'valoradas' });
    const mias = toCatalogQuery(parse('tab=mias&gym=1&orden=valoradas'));
    expect(mias.deMiGimnasio).toBeUndefined();
    expect(mias.orden).toBe('recientes');
  });

  it('cuenta los filtros y los limpia', () => {
    const state = parse('q=press&objetivo=FUERZA&dias=3&gym=1');
    expect(activeFilterCount(state)).toBe(4);
    expect(activeFilterCount(clearFilters(state))).toBe(0);
    expect(activeFilterCount(parse('tab=repp&gym=1'))).toBe(0);
  });
});
