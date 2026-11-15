/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { reviewNodeState, unloggedNote } from './review-state.ts';
import { buildFlowBlocks, type FlowItem } from './workout-flow.ts';

const item = (id: string, extra: Partial<FlowItem> = {}): FlowItem => ({
  id,
  grupo: null,
  target: 4,
  logged: 0,
  descansoSeg: 90,
  descansoEntreSeg: null,
  ...extra,
});

describe('reviewNodeState', () => {
  it('done only when every exercise reached its target', () => {
    assert.equal(reviewNodeState({ items: [item('a', { logged: 4 })] }), 'done');
    assert.equal(reviewNodeState({ items: [item('a', { target: null, logged: 1 })] }), 'done');
    assert.equal(reviewNodeState({ items: [item('a', { logged: 2 })] }), 'partial');
  });

  it('skipped sets and omitted exercises are not work done', () => {
    assert.equal(reviewNodeState({ items: [item('a', { logged: 0, skipped: 4 })] }), 'empty');
    assert.equal(reviewNodeState({ items: [item('a', { omitted: true })] }), 'empty');
    assert.equal(reviewNodeState({ items: [item('a', { target: 0 })] }), 'empty');
    assert.equal(reviewNodeState({ items: [] }), 'empty');
  });

  it('a superset is partial when only one member has sets', () => {
    const blocks = buildFlowBlocks([item('a1', { grupo: 1, logged: 4 }), item('a2', { grupo: 1 })]);
    assert.equal(blocks.length, 1);
    assert.equal(reviewNodeState(blocks[0]!), 'partial');
  });

  it('cancelled session: exercises without sets still get their own node', () => {
    // The TestFlight case: 4 exercises, 2 sets on the first one only.
    const blocks = buildFlowBlocks([item('squat', { logged: 2 }), item('b'), item('c'), item('d')]);
    assert.equal(blocks.length, 4);
    assert.deepEqual(blocks.map(reviewNodeState), ['partial', 'empty', 'empty', 'empty']);
  });
});

describe('unloggedNote', () => {
  it('labels exercises without sets', () => {
    assert.equal(unloggedNote({ logged: 2 }), null);
    assert.equal(unloggedNote({ logged: 0 }), 'Sin series registradas');
    assert.equal(unloggedNote({ logged: 0, omitted: true }), 'Omitido');
  });
});
