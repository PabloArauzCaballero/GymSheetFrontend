/// <reference types="node" />
import assert from 'node:assert/strict';
import test, { describe, it } from 'node:test';
import {
  activeItemOf,
  beatsReference,
  blockFill,
  bumpSeconds,
  buildFlowBlocks,
  currentStep,
  isStaleSession,
  openingWeight,
  pageAfterLogging,
  sessionClock,
  sessionTitle,
  stepFrom,
  withLoggedSet,
  lastTimeLabel,
  parseSeconds,
  previousRestSeconds,
  progressLabel,
  restAfterLogging,
  roundLabel,
  upcomingItems,
  blockState,
  clampRest,
  isItemDone,
  nextSetNumber,
  REST_MAX_SEC,
  restLabel,
  restTargets,
  skipReasonLabel,
  withOmitted,
  withSkippedSet,
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

const single = (id: string, target: number, logged: number): FlowItem => item(id, { target, logged });
const grouped = (id: string, grupo: number, target: number, logged: number): FlowItem =>
  item(id, { grupo, target, logged, descansoEntreSeg: 10, descansoSeg: 90 });

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

test('parseSeconds: «45», «1:30» y fuera de rango', () => {
  assert.equal(parseSeconds('45'), 45);
  assert.equal(parseSeconds(' 1:30 '), 90);
  assert.equal(parseSeconds('60:00'), 3600);
  assert.equal(parseSeconds('0'), null);
  assert.equal(parseSeconds('3601'), null);
  assert.equal(parseSeconds('1:75'), null);
  assert.equal(parseSeconds('4,5'), null);
  assert.equal(parseSeconds(''), null);
});

test('bumpSeconds: suma y resta sin salir de 1–3600', () => {
  assert.equal(bumpSeconds('45', 5), '50');
  assert.equal(bumpSeconds('3', -5), '1');
  assert.equal(bumpSeconds('', 5), '5');
  assert.equal(bumpSeconds('3599', 5), '3600');
});

describe('modo enfoque', () => {

  it('blockFill: la fracción hecha del bloque, sin pasar de 1', () => {
    const [single] = buildFlowBlocks([item('a', { logged: 1 })]);
    assert.equal(blockFill(single!), 1 / 3);
    const [over] = buildFlowBlocks([item('a', { logged: 5 })]);
    assert.equal(blockFill(over!), 1);
    const [superset] = buildFlowBlocks([item('a', { grupo: 1, logged: 3 }), item('b', { grupo: 1, logged: 0 })]);
    assert.equal(blockFill(superset!), 0.5);
    const [manual] = buildFlowBlocks([item('a', { target: null, logged: 0 })]);
    assert.equal(blockFill(manual!), 0);
  });

  it('activeItemOf: el que toca, el elegido, o el último si el bloque terminó', () => {
    const blocks = buildFlowBlocks([item('a', { grupo: 1, logged: 1 }), item('b', { grupo: 1, logged: 0 }), item('c')]);
    assert.equal(activeItemOf(blocks, 0)?.item.id, 'b');
    assert.equal(activeItemOf(blocks, 0)?.step.round, 1);
    assert.equal(activeItemOf(blocks, 0, 'a')?.item.id, 'a');
    assert.equal(activeItemOf(blocks, 1)?.item.id, 'c');
    const done = buildFlowBlocks([item('a', { grupo: 1, logged: 3 }), item('b', { grupo: 1, logged: 3 })]);
    assert.equal(activeItemOf(done, 0)?.item.id, 'b');
    assert.equal(activeItemOf(done, 0)?.done, true);
    assert.equal(activeItemOf(done, 4), null);
  });

  it('pageAfterLogging: el bloque del paso siguiente o el resumen', () => {
    const blocks = buildFlowBlocks([item('a', { logged: 2 }), item('b')]);
    const after = withLoggedSet(blocks, 'a');
    assert.equal(pageAfterLogging(after, stepFrom(after, 0)), 1);
    const last = withLoggedSet(buildFlowBlocks([item('a', { logged: 2 })]), 'a');
    assert.equal(pageAfterLogging(last, stepFrom(last, 0)), 1);
  });

  it('sesión vieja y cronómetro', () => {
    const now = Date.parse('2026-10-13T12:00:00Z');
    assert.equal(isStaleSession('2026-10-13T11:00:00Z', now), false);
    assert.equal(isStaleSession('2026-10-11T11:00:00Z', now), true);
    assert.equal(sessionClock('2026-10-13T11:55:53Z', now), '4:07');
    assert.equal(sessionClock('2026-10-13T10:57:27Z', now), '1:02:33');
    assert.equal(sessionClock('2026-10-13T12:00:10Z', now), '0:00');
  });

  it('sessionTitle: el día manda, la rutina acompaña', () => {
    assert.deepEqual(sessionTitle('Plan: Torso-pierna de Diego · 4 días · Torso fuerte'), {
      title: 'Torso fuerte', subtitle: 'Torso-pierna de Diego · 4 días',
    });
    assert.deepEqual(sessionTitle('Plan: Full body'), { title: 'Full body', subtitle: null });
    assert.deepEqual(sessionTitle('me dolía el hombro'), { title: 'Entrenamiento', subtitle: null });
    assert.deepEqual(sessionTitle(null), { title: 'Entrenamiento', subtitle: null });
  });

  it('openingWeight: nunca inventa un 0', () => {
    assert.equal(openingWeight({ today: 62.5, suggested: 65, lastTime: 60, target: 50 }), 62.5);
    assert.equal(openingWeight({ suggested: 65, lastTime: 60 }), 65);
    assert.equal(openingWeight({ suggested: 0, lastTime: 60 }), 60);
    assert.equal(openingWeight({ target: 40 }), 40);
    assert.equal(openingWeight({}), null);
    assert.equal(openingWeight({ today: 0 }), 0);
  });
});

/* ─── D1 · saltar y omitir ───────────────────────────────────────────────── */

test('una serie saltada avanza el flujo sin contar como hecha', () => {
  const blocks = buildFlowBlocks([single('a', 3, 1), single('b', 2, 0)]);
  const after = withSkippedSet(blocks, 'a');
  assert.deepEqual(currentStep(after), { blockIndex: 0, itemId: 'a', round: 3 });
  assert.equal(after[0]?.items[0]?.logged, 1);
  assert.equal(progressLabel(after[0]!.items[0]!), '1/3');
});

test('saltar la última serie cierra el ejercicio y pasa al siguiente', () => {
  const blocks = buildFlowBlocks([single('a', 2, 1), single('b', 2, 0)]);
  const after = withSkippedSet(blocks, 'a');
  assert.equal(isItemDone(after[0]!.items[0]!), true);
  assert.deepEqual(currentStep(after), { blockIndex: 1, itemId: 'b', round: 1 });
  assert.equal(blockState(after[0]!), 'partial');
  assert.equal(blockFill(after[0]!), 1);
});

test('un ejercicio omitido se da por cerrado y su tramo se marca', () => {
  const blocks = buildFlowBlocks([single('a', 3, 1), single('b', 2, 0)]);
  const after = withOmitted(blocks, 'a');
  assert.deepEqual(currentStep(after), { blockIndex: 1, itemId: 'b', round: 1 });
  assert.equal(blockState(after[0]!), 'omitted');
  assert.equal(blockState(after[1]!), 'pending');
});

test('en una superserie, omitir A1 deja el bloque en A2', () => {
  const blocks = buildFlowBlocks([grouped('a1', 1, 2, 0), grouped('a2', 1, 2, 0)]);
  const after = withOmitted(blocks, 'a1');
  assert.deepEqual(currentStep(after), { blockIndex: 0, itemId: 'a2', round: 1 });
  // Sin transición hacia un ejercicio que ya no se hace: tras A2 viene el descanso de la vuelta.
  const logged = withLoggedSet(after, 'a2');
  assert.equal(restAfterLogging(logged, 'a2').kind, 'round');
});

test('saltar en una superserie cuenta como paso de la vuelta', () => {
  const blocks = buildFlowBlocks([grouped('a1', 1, 2, 0), grouped('a2', 1, 2, 0)]);
  const after = withSkippedSet(blocks, 'a1');
  assert.deepEqual(currentStep(after), { blockIndex: 0, itemId: 'a2', round: 1 });
});

test('el número de la serie siguiente salta las hechas y las saltadas', () => {
  assert.equal(nextSetNumber([], []), 1);
  assert.equal(nextSetNumber([1, 2], []), 3);
  assert.equal(nextSetNumber([1], [2]), 3);
  assert.equal(nextSetNumber([], [1, 2]), 3);
});

test('los motivos tienen texto y uno desconocido cae en «Otro motivo»', () => {
  assert.equal(skipReasonLabel('PRISA'), 'Voy con prisa');
  assert.equal(skipReasonLabel('LO_QUE_SEA'), 'Otro motivo');
});

/* ─── D2 · descanso a mano ───────────────────────────────────────────────── */

test('el descanso se acota y se redondea a pasos de 5 s', () => {
  assert.equal(clampRest(92), 90);
  assert.equal(clampRest(93), 95);
  assert.equal(clampRest(-10), 0);
  assert.equal(clampRest(99999), REST_MAX_SEC);
  assert.equal(clampRest(Number.NaN), 0);
  assert.equal(restLabel(150), '2:30');
  assert.equal(restLabel(45), '0:45');
});

test('«a todos los que quedan» no toca los ejercicios ya cerrados', () => {
  const blocks = buildFlowBlocks([single('a', 2, 2), single('b', 2, 1), single('c', 2, 0)]);
  assert.deepEqual(restTargets(blocks, 'b', 'one').map((item) => item.id), ['b']);
  assert.deepEqual(restTargets(blocks, 'b', 'remaining').map((item) => item.id), ['b', 'c']);
  // El propio entra aunque ya esté cerrado (se le cambia para una serie extra).
  assert.deepEqual(restTargets(blocks, 'a', 'remaining').map((item) => item.id), ['a', 'b', 'c']);
});

test('mejor que la última vez: más peso, o el mismo con más repeticiones', () => {
  const ref = { pesoKg: 60, repeticiones: 8 };
  assert.equal(beatsReference({ pesoKg: 62.5, repeticiones: 5 }, ref), true);
  assert.equal(beatsReference({ pesoKg: 60, repeticiones: 9 }, ref), true);
  assert.equal(beatsReference({ pesoKg: 60, repeticiones: 8 }, ref), false);
  assert.equal(beatsReference({ pesoKg: 57.5, repeticiones: 12 }, ref), false);
  // Primera vez o sin carga: no hay marca.
  assert.equal(beatsReference({ pesoKg: 60, repeticiones: 8 }, null), false);
  assert.equal(beatsReference({ pesoKg: 0, repeticiones: 20 }, { pesoKg: 0, repeticiones: 12 }), false);
});
