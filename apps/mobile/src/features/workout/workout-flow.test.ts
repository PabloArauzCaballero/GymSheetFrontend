/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildFlowBlocks,
  currentStep,
  lastTimeLabel,
  previousRestSeconds,
  progressLabel,
  restAfterLogging,
  roundLabel,
  upcomingItems,
  type FlowItem,
} from './workout-flow.ts';

const item = (id: string, extra: Partial<FlowItem> = {}): FlowItem => ({
  id,
  grupo: null,
  target: 3,
  logged: 0,
  descansoSeg: 120,
  descansoEntreSeg: null,
  ...extra,
});

/** Press suelto (2:00) + superserie A (A1 sin transición, 1:30 tras la vuelta) + plancha. */
function day(logged: Record<string, number> = {}) {
  return buildFlowBlocks([
    item('press', { logged: logged.press ?? 0 }),
    item('a1', { grupo: 1, descansoEntreSeg: 0, descansoSeg: 0, logged: logged.a1 ?? 0 }),
    item('a2', { grupo: 1, descansoEntreSeg: 0, descansoSeg: 90, logged: logged.a2 ?? 0 }),
    item('plank', { target: 2, descansoSeg: 45, logged: logged.plank ?? 0 }),
  ]);
}

test('agrupa la superserie y toma el descanso del último como el de tras la vuelta', () => {
  const blocks = day();
  assert.equal(blocks.length, 3);
  assert.equal(blocks[1]?.kind, 'superserie');
  assert.equal(blocks[1]?.label, 'A');
  assert.equal(blocks[1]?.rounds, 3);
  assert.equal(blocks[1]?.restAfter, 90);
  assert.equal(blocks[1]?.between, 0);
});

test('el ejercicio suelto va primero y descansa lo suyo (2:00, no 90 s)', () => {
  assert.deepEqual(currentStep(day()), { blockIndex: 0, itemId: 'press', round: 1 });
  assert.deepEqual(restAfterLogging(day({ press: 1 }), 'press'), { seconds: 120, kind: 'set' });
});

test('superserie: A1 → A2 sin descanso, descanso tras la vuelta, y vuelta 2', () => {
  assert.deepEqual(currentStep(day({ press: 3 })), { blockIndex: 1, itemId: 'a1', round: 1 });
  assert.deepEqual(restAfterLogging(day({ press: 3, a1: 1 }), 'a1'), { seconds: 0, kind: 'none' });
  assert.deepEqual(currentStep(day({ press: 3, a1: 1 })), { blockIndex: 1, itemId: 'a2', round: 1 });
  assert.deepEqual(restAfterLogging(day({ press: 3, a1: 1, a2: 1 }), 'a2'), { seconds: 90, kind: 'round' });
  assert.deepEqual(currentStep(day({ press: 3, a1: 1, a2: 1 })), { blockIndex: 1, itemId: 'a1', round: 2 });
  assert.equal(roundLabel(2, 3), 'Vuelta 2/3');
});

test('con transición, entre A1 y A2 se descansa la transición', () => {
  const blocks = buildFlowBlocks([
    item('a1', { grupo: 4, descansoEntreSeg: 15, logged: 1 }),
    item('a2', { grupo: 4, descansoEntreSeg: 15, descansoSeg: 60 }),
  ]);
  assert.deepEqual(restAfterLogging(blocks, 'a1'), { seconds: 15, kind: 'between' });
});

test('tras la última serie de la sesión no hay descanso', () => {
  const blocks = day({ press: 3, a1: 3, a2: 3, plank: 2 });
  assert.equal(currentStep(blocks), null);
  assert.deepEqual(restAfterLogging(blocks, 'plank'), { seconds: 0, kind: 'none' });
});

test('sin descanso en el plan se usa 90 s; sin objetivo nunca se da por terminado', () => {
  const blocks = buildFlowBlocks([item('x', { target: null, descansoSeg: null, logged: 5 })]);
  assert.deepEqual(currentStep(blocks), { blockIndex: 0, itemId: 'x', round: 6 });
  assert.deepEqual(restAfterLogging(blocks, 'x'), { seconds: 90, kind: 'set' });
  assert.equal(progressLabel({ logged: 2, target: null }), '2 series');
  assert.equal(progressLabel({ logged: 2, target: 4 }), '2/4');
});

test('«Siguiente»: el resto de la vuelta, la vuelta siguiente y luego lo demás', () => {
  const blocks = day({ press: 3, a1: 1 });
  const step = currentStep(blocks);
  assert.deepEqual(upcomingItems(blocks, step).map((i) => i.id), ['a1', 'plank']);
});

test('descansoSegAnterior real: desde la última serie de la sesión, acotado', () => {
  const now = Date.parse('2026-10-10T10:02:00Z');
  assert.equal(previousRestSeconds([], now), 0);
  assert.equal(previousRestSeconds(['2026-10-10T10:00:00Z', '2026-10-10T10:00:30Z'], now), 90);
  assert.equal(previousRestSeconds(['2026-10-10T05:00:00Z'], now), 7200);
});

test('«Última vez: 9 × 80 kg»', () => {
  assert.equal(lastTimeLabel({ pesoKg: 80, repeticiones: 9 }), '9 × 80 kg');
  assert.equal(lastTimeLabel({ pesoKg: 62.5, repeticiones: 8 }), '8 × 62,5 kg');
});

test('tras registrar en un bloque elegido a mano, se sigue en ese bloque', async () => {
  const { stepFrom, withLoggedSet, stepOf } = await import('./workout-flow.ts');
  const blocks = day();
  // Empieza por la superserie aunque el press esté pendiente.
  const after = withLoggedSet(blocks, 'a1');
  assert.deepEqual(stepFrom(after, 1), { blockIndex: 1, itemId: 'a2', round: 1 });
  assert.deepEqual(stepOf(blocks, 'plank'), { blockIndex: 2, itemId: 'plank', round: 1 });
});
