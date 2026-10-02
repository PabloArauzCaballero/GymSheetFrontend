import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { boundsArea, boundsOf, placeBounds } from './region-fit.ts';
import type { BodyRegion } from './types.ts';

const viewBox = { width: 1000, height: 2000 };
const box = { width: 400, height: 240 };

function rect(minX: number, minY: number, maxX: number, maxY: number): BodyRegion {
  return { code: 'X', rings: [[minX, minY, maxX, minY, maxX, maxY, minX, maxY]] };
}

describe('boundsOf', () => {
  it('wraps one region', () => {
    assert.deepEqual(boundsOf([rect(10, 20, 110, 220)]), { minX: 10, minY: 20, maxX: 110, maxY: 220 });
  });

  it('wraps several regions together (a muscle that appears left and right)', () => {
    assert.deepEqual(boundsOf([rect(100, 100, 200, 300), rect(700, 120, 800, 320)]), {
      minX: 100,
      minY: 100,
      maxX: 800,
      maxY: 320,
    });
  });

  it('is null when there are no points', () => {
    assert.equal(boundsOf([]), null);
    assert.equal(boundsOf([{ code: 'X', rings: [] }]), null);
  });
});

describe('placeBounds', () => {
  it('centres the bounds in the box', () => {
    const bounds = { minX: 300, minY: 600, maxX: 500, maxY: 800 };
    const p = placeBounds(bounds, box, viewBox);
    assert.ok(Math.abs(p.left + 400 * p.unit - box.width / 2) < 1e-9);
    assert.ok(Math.abs(p.top + 700 * p.unit - box.height / 2) < 1e-9);
  });

  it('sizes the whole sheet from the viewBox and the unit', () => {
    const p = placeBounds({ minX: 300, minY: 600, maxX: 500, maxY: 800 }, box, viewBox);
    assert.equal(p.width, 1000 * p.unit);
    assert.equal(p.height, 2000 * p.unit);
  });

  it('leaves air around the muscle', () => {
    const bounds = { minX: 300, minY: 600, maxX: 500, maxY: 800 };
    const tight = placeBounds(bounds, box, viewBox, { padding: 1, maxZoomViewBoxHeight: 100 });
    const airy = placeBounds(bounds, box, viewBox, { padding: 2, maxZoomViewBoxHeight: 100 });
    assert.ok(airy.unit < tight.unit);
  });

  it('never zooms out past the whole figure fitting in the box', () => {
    const huge = { minX: 0, minY: 0, maxX: 1000, maxY: 2000 };
    const p = placeBounds(huge, box, viewBox);
    assert.equal(p.unit, Math.min(box.width / viewBox.width, box.height / viewBox.height));
  });

  it('does not blow a tiny muscle up into a blur', () => {
    const tiny = { minX: 490, minY: 990, maxX: 500, maxY: 1000 };
    const p = placeBounds(tiny, box, viewBox);
    // Como mucho se ven `maxZoomViewBoxHeight` unidades de alto.
    assert.equal(p.unit, box.height / 500);
  });

  it('tolerates a degenerate (zero-size) region', () => {
    const point = { minX: 500, minY: 500, maxX: 500, maxY: 500 };
    const p = placeBounds(point, box, viewBox);
    assert.ok(Number.isFinite(p.unit) && p.unit > 0);
  });
});

describe('boundsArea', () => {
  it('is the area of the box, and 0 for none', () => {
    assert.equal(boundsArea({ minX: 0, minY: 0, maxX: 10, maxY: 20 }), 200);
    assert.equal(boundsArea(null), 0);
  });
});
