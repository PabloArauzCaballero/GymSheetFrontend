/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import { cardContextOf } from './card-context-logic.ts';

test('a verified card nearby shows the badge, the distance and capped reasons in order', () => {
  const context = cardContextOf({
    reasons: ['NEARBY', 'NEW_HERE', 'VERIFIED', 'SHARED_INTERESTS', 'SAME_GOAL', 'SAME_ROUTINE'],
    distanceKm: 2,
  });
  assert.equal(context.verified, true);
  assert.equal(context.distance, 'a 2 km');
  assert.deepEqual(context.chips.map((chip) => chip.label), ['Misma rutina', 'Mismo objetivo', 'Intereses en común']);
  assert.deepEqual(context.chips.map((chip) => chip.icon), ['repeat-outline', 'flag-outline', 'sparkles-outline']);
});

test('an unverified card without location shows no badge and no distance', () => {
  const context = cardContextOf({ reasons: ['NEARBY'], distanceKm: null });
  assert.equal(context.verified, false);
  assert.equal(context.distance, null);
  assert.deepEqual(context.chips.map((chip) => chip.label), ['Cerca de ti']);
});

test('presence is never rendered, even if an older server sends it', () => {
  const context = cardContextOf({ reasons: ['TRAINING_NOW', 'ACTIVE_NOW'], distanceKm: 0.4 });
  assert.deepEqual(context.chips, []);
  assert.equal(context.distance, 'a menos de 1 km');
  const text = JSON.stringify(context).toLowerCase();
  assert.equal(text.includes('ahora'), false);
});

test('two confirmed members of the same gym lead with «Tu mismo gimnasio» (ADR-0027)', () => {
  const context = cardContextOf({ reasons: ['SAME_ROUTINE', 'SAME_GYM'], distanceKm: null });
  assert.deepEqual(context.chips.map((chip) => chip.label), ['Tu mismo gimnasio', 'Misma rutina']);
  assert.equal(context.chips[0]?.icon, 'business-outline');
});
