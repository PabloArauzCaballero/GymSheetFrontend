/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ANCHOR_WAIT_MS,
  CARD_GAP,
  decideTourOpen,
  HALO,
  placeCard,
  scrollDeltaFor,
  SETTLE_MS,
  TOUR_GRACE_MS,
  type OpenInput,
} from './tour-queue.ts';

const base: OpenInput = {
  hydrated: true,
  done: false,
  anotherActive: false,
  focusedAt: 1_000,
  closedAt: null,
  needsAnchor: true,
  anchorMeasuredAt: null,
  now: 1_000,
};

test('no abre nada hasta leer las banderas, ni si ya se vio', () => {
  assert.equal(decideTourOpen({ ...base, hydrated: false }).kind, 'hold');
  assert.equal(decideTourOpen({ ...base, done: true }).kind, 'hold');
});

test('una pestaña sin foco no abre su tour: así no cae sobre otra pantalla', () => {
  assert.equal(decideTourOpen({ ...base, focusedAt: null, now: 9_000 }).kind, 'hold');
});

test('no abre mientras hay otro tour en pantalla', () => {
  assert.equal(decideTourOpen({ ...base, anotherActive: true, now: 9_000 }).kind, 'hold');
});

test('espera a que la pantalla se quede quieta antes de medir', () => {
  const decision = decideTourOpen({ ...base, now: 1_000 + 100 });
  assert.deepEqual(decision, { kind: 'wait', retryInMs: SETTLE_MS - 100, remeasure: false });
});

test('tras otro tour espera el descanso aunque la pantalla ya esté quieta', () => {
  const decision = decideTourOpen({
    ...base,
    focusedAt: 0,
    closedAt: 5_000,
    now: 5_000 + 200,
  });
  assert.deepEqual(decision, { kind: 'wait', retryInMs: TOUR_GRACE_MS - 200, remeasure: false });
});

test('una medida anterior a que la pantalla se asiente no vale', () => {
  const decision = decideTourOpen({
    ...base,
    now: 1_000 + SETTLE_MS,
    anchorMeasuredAt: 1_000 + SETTLE_MS - 1,
  });
  assert.equal(decision.kind, 'wait');
  assert.equal(decision.kind === 'wait' && decision.remeasure, true);
});

test('con el elemento medido después de asentarse, abre', () => {
  const decision = decideTourOpen({
    ...base,
    now: 1_000 + SETTLE_MS + 50,
    anchorMeasuredAt: 1_000 + SETTLE_MS + 10,
  });
  assert.deepEqual(decision, { kind: 'open', reason: 'ready' });
});

test('si el primer paso no apunta a nada, abre en cuanto toca', () => {
  const decision = decideTourOpen({ ...base, needsAnchor: false, now: 1_000 + SETTLE_MS });
  assert.deepEqual(decision, { kind: 'open', reason: 'ready' });
});

test('si el elemento no aparece, abre pasado el tope y no se queda esperando para siempre', () => {
  const waiting = decideTourOpen({ ...base, now: 1_000 + SETTLE_MS + ANCHOR_WAIT_MS - 1 });
  assert.equal(waiting.kind, 'wait');
  const timedOut = decideTourOpen({ ...base, now: 1_000 + SETTLE_MS + ANCHOR_WAIT_MS });
  assert.deepEqual(timedOut, { kind: 'open', reason: 'anchor-timeout' });
});

test('el reintento mientras espera el elemento no pasa de 300 ms', () => {
  const decision = decideTourOpen({ ...base, now: 1_000 + SETTLE_MS });
  assert.equal(decision.kind === 'wait' && decision.retryInMs <= 300, true);
});

const stage = { stageHeight: 800, insetTop: 50, insetBottom: 34 };

test('la tarjeta va pegada al hueco, en el lado con más sitio', () => {
  const nearTop = placeCard({ ...stage, hole: { x: 16, y: 120, width: 300, height: 80 } });
  assert.equal(nearTop.side, 'below');
  assert.equal(nearTop.side === 'below' && nearTop.top, 120 + 80 + HALO + CARD_GAP);

  const nearBottom = placeCard({ ...stage, hole: { x: 16, y: 560, width: 300, height: 80 } });
  assert.equal(nearBottom.side, 'above');
  assert.equal(nearBottom.side === 'above' && nearBottom.bottom, 800 - (560 - HALO) + CARD_GAP);
});

test('la tarjeta nunca se sale del espacio que le queda', () => {
  const placement = placeCard({ ...stage, hole: { x: 0, y: 300, width: 100, height: 100 } });
  assert.equal(placement.maxHeight <= 440, true);
  assert.equal(placement.maxHeight >= 200, true);
});

test('con un elemento altísimo la tarjeta flota abajo en vez de salirse', () => {
  const placement = placeCard({ ...stage, hole: { x: 0, y: 140, width: 360, height: 560 } });
  assert.equal(placement.side, 'floating');
  assert.equal(placement.maxHeight >= 200, true);
});

test('un elemento ya dentro de la franja no desplaza la lista', () => {
  assert.equal(scrollDeltaFor({ anchorTop: 300, anchorHeight: 120, stageHeight: 800 }), 0);
});

test('un elemento por debajo de la franja se trae hacia arriba', () => {
  const delta = scrollDeltaFor({ anchorTop: 700, anchorHeight: 120, stageHeight: 800 });
  assert.equal(delta, 700 + 120 - 640);
});

test('un elemento por encima de la franja se baja', () => {
  const delta = scrollDeltaFor({ anchorTop: 20, anchorHeight: 100, stageHeight: 800 });
  assert.equal(delta, 20 - 160);
});

test('un elemento alto se encuadra por su borde superior, no por el inferior', () => {
  const delta = scrollDeltaFor({ anchorTop: 600, anchorHeight: 500, stageHeight: 800 });
  assert.equal(delta, 600 - 160);
});

test('menos de 12 px de diferencia no justifica un desplazamiento', () => {
  assert.equal(scrollDeltaFor({ anchorTop: 165, anchorHeight: 100, stageHeight: 800 }), 0);
});
