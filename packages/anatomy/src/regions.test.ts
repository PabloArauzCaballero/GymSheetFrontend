import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { hitTest } from './hit-test.ts';
import { AGGREGATES, MUSCLES, muscleInfo, musclesByGroup } from './muscle-catalog.ts';
import { IMAGE_ASPECT, REGIONS, REGION_VIEWBOX } from './regions.generated.ts';

/**
 * Pruebas sobre las zonas REALES generadas por `tools/anatomy/trace.py`: lo que
 * garantizan es el contrato de producto —«todo músculo se puede tocar»—, no la
 * geometría, que ya cubren `hit-test.test.ts` y `view-transform.test.ts`.
 */

const TAGS = ['surface-front', 'surface-back', 'deep-front', 'deep-back'] as const;

/** Músculos que tienen zona propia: todos menos el agregado y el sistema cardiovascular. */
const TOUCHABLE = MUSCLES.map((m) => m.code).filter((code) => !(code in AGGREGATES) && code !== 'CARDIOVASCULAR');

/** Busca, en una rejilla sobre la caja de la zona, un punto donde el toque resuelve a `code`. */
function reachable(tag: string, code: string): boolean {
  const regions = REGIONS[tag] ?? [];
  for (const region of regions.filter((r) => r.code === code)) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const ring of region.rings) {
      for (let i = 0; i < ring.length; i += 2) {
        minX = Math.min(minX, ring[i] as number);
        maxX = Math.max(maxX, ring[i] as number);
        minY = Math.min(minY, ring[i + 1] as number);
        maxY = Math.max(maxY, ring[i + 1] as number);
      }
    }
    for (let y = minY; y <= maxY; y += 2) {
      for (let x = minX; x <= maxX; x += 2) {
        const hit = hitTest(regions, x, y);
        if (hit?.code === code && hit.exact) return true;
      }
    }
  }
  return false;
}

describe('generated regions', () => {
  it('exist for the four layer/view combinations', () => {
    for (const tag of TAGS) assert.ok((REGIONS[tag] ?? []).length > 0, `${tag} sin zonas`);
  });

  it('only use muscle codes that are in the catalogue', () => {
    for (const tag of TAGS) {
      for (const region of REGIONS[tag] ?? []) {
        assert.ok(muscleInfo(region.code), `${tag}: código desconocido ${region.code}`);
      }
    }
  });

  it('stay inside the viewBox', () => {
    for (const tag of TAGS) {
      for (const region of REGIONS[tag] ?? []) {
        for (const ring of region.rings) {
          for (let i = 0; i < ring.length; i += 2) {
            const x = ring[i] as number;
            const y = ring[i + 1] as number;
            assert.ok(x >= 0 && x <= REGION_VIEWBOX.width, `${tag}/${region.code}: x=${x}`);
            assert.ok(y >= 0 && y <= REGION_VIEWBOX.height, `${tag}/${region.code}: y=${y}`);
          }
        }
      }
    }
  });

  it('describe closed rings with at least three points', () => {
    for (const tag of TAGS) {
      for (const region of REGIONS[tag] ?? []) {
        for (const ring of region.rings) {
          assert.equal(ring.length % 2, 0);
          assert.ok(ring.length >= 6, `${tag}/${region.code}: anillo de ${ring.length / 2} puntos`);
        }
      }
    }
  });

  it('match the aspect ratio of the rendered images', () => {
    assert.equal(IMAGE_ASPECT, REGION_VIEWBOX.width / REGION_VIEWBOX.height);
  });
});

describe('every muscle can be tapped', () => {
  it('knows the 35 muscles of the figure', () => {
    // 36 de la taxonomía menos CARDIOVASCULAR (no es un músculo) = 35, de los
    // cuales DELTOID es agregado de tres fascículos y no tiene zona propia.
    assert.equal(TOUCHABLE.length, 34);
    assert.equal(Object.keys(AGGREGATES).length, 1);
  });

  for (const code of TOUCHABLE) {
    it(`${code} resolves exactly in at least one view`, () => {
      const where = TAGS.filter((tag) => reachable(tag, code));
      assert.ok(where.length > 0, `${code} no se puede tocar en ninguna vista`);
    });
  }

  it('reaches DELTOID through its three heads', () => {
    for (const part of AGGREGATES.DELTOID ?? []) {
      assert.ok(
        TAGS.some((tag) => reachable(tag, part)),
        `${part} inalcanzable`,
      );
    }
  });
});

describe('the list view', () => {
  it('lists every muscle of the catalogue exactly once, by group', () => {
    const listed = musclesByGroup().flatMap((entry) => entry.muscles.map((m) => m.code));
    const expected = MUSCLES.map((m) => m.code);
    assert.deepEqual([...listed].sort(), [...expected].sort());
    assert.equal(new Set(listed).size, listed.length);
  });

  it('has a group for every muscle', () => {
    for (const muscle of MUSCLES) assert.ok(muscle.group.name.length > 0, muscle.code);
  });
});
