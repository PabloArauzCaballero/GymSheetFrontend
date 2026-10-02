import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { containsPoint, distanceToBoundary, hitTest, toPathData } from './hit-test.ts';
import type { BodyRegion } from './types.ts';

/** Cuadrado de lado `side` con la esquina superior izquierda en (x, y). */
function square(x: number, y: number, side: number): number[] {
  return [x, y, x + side, y, x + side, y + side, x, y + side];
}

describe('containsPoint', () => {
  it('is true inside a ring and false outside', () => {
    const rings = [square(0, 0, 10)];
    assert.equal(containsPoint(rings, 5, 5), true);
    assert.equal(containsPoint(rings, 15, 5), false);
    assert.equal(containsPoint(rings, 5, -1), false);
  });

  it('treats a hole as outside (even-odd rule, like SVG evenodd)', () => {
    const rings = [square(0, 0, 10), square(3, 3, 4)];
    assert.equal(containsPoint(rings, 1, 1), true);
    assert.equal(containsPoint(rings, 5, 5), false);
  });

  it('handles a concave shape', () => {
    // «L»: el brazo corto sale por abajo a la derecha.
    const rings = [[0, 0, 10, 0, 10, 4, 4, 4, 4, 10, 0, 10]];
    assert.equal(containsPoint(rings, 2, 8), true);
    assert.equal(containsPoint(rings, 8, 8), false);
    assert.equal(containsPoint(rings, 8, 2), true);
  });

  it('is false for an empty region', () => {
    assert.equal(containsPoint([], 1, 1), false);
  });
});

describe('distanceToBoundary', () => {
  it('measures to the nearest edge from inside and from outside', () => {
    const rings = [square(0, 0, 10)];
    assert.equal(distanceToBoundary(rings, 5, 2), 2);
    assert.equal(distanceToBoundary(rings, 13, 5), 3);
  });

  it('measures to the corner when the nearest point is a vertex', () => {
    assert.equal(distanceToBoundary([square(0, 0, 10)], 13, 14), 5);
  });

  it('counts the edge of a hole', () => {
    const rings = [square(0, 0, 10), square(3, 3, 4)];
    assert.equal(distanceToBoundary(rings, 5, 5), 2);
  });
});

describe('hitTest', () => {
  const big: BodyRegion = { code: 'BIG', rings: [square(0, 0, 100)] };
  const small: BodyRegion = { code: 'SMALL', rings: [square(40, 40, 10)] };
  const far: BodyRegion = { code: 'FAR', rings: [square(200, 0, 20)] };

  it('returns the region under the point, flagged exact', () => {
    assert.deepEqual(hitTest([big, far], 10, 10), { code: 'BIG', exact: true });
    assert.deepEqual(hitTest([big, far], 210, 10), { code: 'FAR', exact: true });
  });

  it('prefers the smaller region when two overlap, whatever the order', () => {
    assert.equal(hitTest([big, small], 45, 45)?.code, 'SMALL');
    assert.equal(hitTest([small, big], 45, 45)?.code, 'SMALL');
    assert.equal(hitTest([big, small], 10, 10)?.code, 'BIG');
  });

  it('returns null outside every region when there is no slop', () => {
    assert.equal(hitTest([big, far], 150, 50), null);
  });

  it('snaps to a region whose edge is within the slop, flagged inexact', () => {
    assert.deepEqual(hitTest([big, far], 195, 10, 8), { code: 'FAR', exact: false });
  });

  it('does not snap beyond the slop', () => {
    assert.equal(hitTest([big, far], 180, 10, 8), null);
  });

  it('snaps to the nearer of two candidates', () => {
    const left: BodyRegion = { code: 'LEFT', rings: [square(0, 0, 10)] };
    const right: BodyRegion = { code: 'RIGHT', rings: [square(30, 0, 10)] };
    assert.equal(hitTest([left, right], 13, 5, 20)?.code, 'LEFT');
    assert.equal(hitTest([left, right], 27, 5, 20)?.code, 'RIGHT');
  });

  it('is exact, not snapped, when the point is inside even with a slop', () => {
    assert.deepEqual(hitTest([big, far], 10, 10, 50), { code: 'BIG', exact: true });
  });

  it('returns null for no regions', () => {
    assert.equal(hitTest([], 1, 1, 10), null);
  });
});

describe('toPathData', () => {
  it('writes one closed subpath per ring', () => {
    assert.equal(toPathData([[0, 0, 10, 0, 10, 10]]), 'M0 0L10 0L10 10Z');
    assert.equal(toPathData([[0, 0, 4, 0, 4, 4], [1, 1, 2, 1, 2, 2]]), 'M0 0L4 0L4 4ZM1 1L2 1L2 2Z');
  });

  it('is empty for no rings', () => {
    assert.equal(toPathData([]), '');
  });
});
