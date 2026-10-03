import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  IDENTITY,
  MAX_SCALE,
  MIN_SCALE,
  clampScale,
  clampTransform,
  containFrame,
  contentToViewBox,
  pointsToViewBox,
  screenToContent,
  zoomAbout,
} from './view-transform.ts';

const container = { width: 400, height: 800 };

/** Compara con tolerancia de coma flotante. */
function near(actual: number, expected: number, epsilon = 1e-9): void {
  assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} no está cerca de ${expected}`);
}

/** pantalla = centro + t + scale · (p − centro): la definición del módulo. */
function contentToScreen(p: { x: number; y: number }, t: { scale: number; tx: number; ty: number }) {
  const cx = container.width / 2;
  const cy = container.height / 2;
  return { x: cx + t.tx + t.scale * (p.x - cx), y: cy + t.ty + t.scale * (p.y - cy) };
}

describe('clampScale', () => {
  it('keeps the scale within the allowed range', () => {
    assert.equal(clampScale(0.2), MIN_SCALE);
    assert.equal(clampScale(2.5), 2.5);
    assert.equal(clampScale(99), MAX_SCALE);
  });
});

describe('clampTransform', () => {
  it('allows no panning at scale 1', () => {
    assert.deepEqual(clampTransform({ scale: 1, tx: 50, ty: -80 }, container), IDENTITY);
  });

  it('allows only the surplus when zoomed', () => {
    // A 2×, el contenido mide el doble: sobra la mitad del contenedor por lado.
    const t = clampTransform({ scale: 2, tx: 9999, ty: -9999 }, container);
    assert.equal(t.tx, 200);
    assert.equal(t.ty, -400);
  });

  it('leaves a valid pan alone', () => {
    assert.deepEqual(clampTransform({ scale: 2, tx: 30, ty: -40 }, container), { scale: 2, tx: 30, ty: -40 });
  });

  it('clamps an out-of-range scale first, then the pan against the new scale', () => {
    const t = clampTransform({ scale: 10, tx: 9999, ty: 0 }, container);
    assert.equal(t.scale, MAX_SCALE);
    assert.equal(t.tx, (400 * (MAX_SCALE - 1)) / 2);
  });
});

describe('screenToContent', () => {
  it('is the identity at scale 1 with no pan', () => {
    assert.deepEqual(screenToContent({ x: 123, y: 456 }, IDENTITY, container), { x: 123, y: 456 });
  });

  it('inverts the transform: content -> screen -> content', () => {
    const t = { scale: 2.5, tx: 40, ty: -90 };
    for (const p of [{ x: 10, y: 20 }, { x: 200, y: 400 }, { x: 390, y: 790 }]) {
      const back = screenToContent(contentToScreen(p, t), t, container);
      near(back.x, p.x);
      near(back.y, p.y);
    }
  });
});

describe('zoomAbout', () => {
  it('keeps the point under the fingers where it was', () => {
    const focal = { x: 300, y: 250 };
    const before = screenToContent(focal, IDENTITY, container);
    const t = zoomAbout(IDENTITY, 3, focal, container);
    const after = screenToContent(focal, t, container);
    near(after.x, before.x);
    near(after.y, before.y);
    assert.equal(t.scale, 3);
  });

  it('keeps the focal point stable across successive zooms', () => {
    const focal = { x: 120, y: 600 };
    const anchor = screenToContent(focal, IDENTITY, container);
    let t = zoomAbout(IDENTITY, 2, focal, container);
    t = zoomAbout(t, 3.2, focal, container);
    const after = screenToContent(focal, t, container);
    near(after.x, anchor.x, 1e-6);
    near(after.y, anchor.y, 1e-6);
  });

  it('zooming about the centre does not pan', () => {
    const t = zoomAbout(IDENTITY, 2, { x: 200, y: 400 }, container);
    assert.equal(t.tx, 0);
    assert.equal(t.ty, 0);
  });

  it('never exceeds the scale limits', () => {
    assert.equal(zoomAbout(IDENTITY, 50, { x: 10, y: 10 }, container).scale, MAX_SCALE);
    assert.equal(zoomAbout({ scale: 2, tx: 0, ty: 0 }, 0.1, { x: 10, y: 10 }, container).scale, MIN_SCALE);
  });

  it('returns to a centred, unpanned view at scale 1', () => {
    const zoomed = zoomAbout(IDENTITY, 3, { x: 50, y: 60 }, container);
    const back = zoomAbout(zoomed, 1, { x: 50, y: 60 }, container);
    assert.deepEqual(back, IDENTITY);
  });
});

describe('containFrame', () => {
  it('fits a tall image by height and centres it horizontally', () => {
    const frame = containFrame({ width: 400, height: 600 }, 0.5);
    assert.deepEqual(frame, { x: 50, y: 0, width: 300, height: 600 });
  });

  it('fits a wide image by width and centres it vertically', () => {
    const frame = containFrame({ width: 400, height: 1000 }, 0.5);
    assert.deepEqual(frame, { x: 0, y: 100, width: 400, height: 800 });
  });

  it('fills the container when the proportions match', () => {
    assert.deepEqual(containFrame({ width: 300, height: 600 }, 0.5), { x: 0, y: 0, width: 300, height: 600 });
  });
});

describe('contentToViewBox', () => {
  const frame = { x: 50, y: 0, width: 300, height: 600 };
  const viewBox = { width: 1000, height: 2000 };

  it('maps the corners and the centre of the frame', () => {
    assert.deepEqual(contentToViewBox({ x: 50, y: 0 }, frame, viewBox), { x: 0, y: 0 });
    assert.deepEqual(contentToViewBox({ x: 350, y: 600 }, frame, viewBox), { x: 1000, y: 2000 });
    assert.deepEqual(contentToViewBox({ x: 200, y: 300 }, frame, viewBox), { x: 500, y: 1000 });
  });

  it('is null in the empty strip beside the image', () => {
    assert.equal(contentToViewBox({ x: 10, y: 300 }, frame, viewBox), null);
    assert.equal(contentToViewBox({ x: 390, y: 300 }, frame, viewBox), null);
  });

  it('is null above and below the image', () => {
    assert.equal(contentToViewBox({ x: 200, y: -1 }, frame, viewBox), null);
    assert.equal(contentToViewBox({ x: 200, y: 601 }, frame, viewBox), null);
  });
});

describe('pointsToViewBox', () => {
  const frame = { x: 0, y: 0, width: 250, height: 500 };
  const viewBox = { width: 1000, height: 2000 };

  it('converts screen points to viewBox units', () => {
    // 250 puntos de ancho cubren 1000 unidades: 1 punto = 4 unidades.
    assert.equal(pointsToViewBox(10, frame, viewBox, 1), 40);
  });

  it('shrinks with zoom so the finger stays the same size on screen', () => {
    assert.equal(pointsToViewBox(10, frame, viewBox, 2), 20);
    assert.equal(pointsToViewBox(10, frame, viewBox, 4), 10);
  });
});
