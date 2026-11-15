import { describe, expect, it } from 'vitest';
import { pageSchema, routineCatalogPageSchema, routineSchema } from '@gymsheet/schemas';
// Real payloads captured from the local API (trimmed to keep them readable).
import legacyPage from './__fixtures__/routines-public-page.json';
import catalogPage from './__fixtures__/routines-public-catalog.json';

/**
 * `GET /routines` answers two different contracts. Mobile «Explorar rutinas»
 * (also the TestFlight builds already shipped) asks `scope=public&pageSize&page`
 * and validates full routines; the tabbed catalog asks with `limit`/`cursor` and
 * gets lightweight cards. A backend that hands the cards to the first caller
 * shows «Respuesta no válida» on that screen.
 */
describe('GET /routines · contract per caller', () => {
  it('scope=public&pageSize&page parses with the schema mobile explore uses', () => {
    const page = pageSchema(routineSchema).parse(legacyPage.data);
    expect(page.items.length).toBeGreaterThan(0);
    expect(page.items[0]?.creadoPorUsuarioId).toMatch(/^[0-9a-f-]{36}$/u);
    expect(page.items[0]?.ejercicios.length).toBeGreaterThan(0);
    expect(page.totalPages).toBeGreaterThan(0);
  });

  it('the catalog cards parse as cards and are rejected as full routines', () => {
    expect(routineCatalogPageSchema.parse(catalogPage.data).items).toHaveLength(2);
    const asLegacy = pageSchema(routineSchema).safeParse(catalogPage.data);
    expect(asLegacy.success).toBe(false);
    const paths = asLegacy.error?.issues.map((issue) => issue.path.join('.')) ?? [];
    expect(paths).toEqual(expect.arrayContaining(['items.0.creadoPorUsuarioId', 'items.0.ejercicios', 'page']));
  });
});
