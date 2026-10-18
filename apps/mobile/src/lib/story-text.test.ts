/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeStoryCaption, storyTimeLeftLabel } from './story-text.ts';

test('a blank caption is no caption', () => {
  assert.equal(normalizeStoryCaption('   \n  '), null);
});

test('trims, normalizes line breaks and caps lines and length', () => {
  assert.equal(normalizeStoryCaption('  Día de pierna \r\n'), 'Día de pierna');
  assert.equal(normalizeStoryCaption('a\nb\nc\nd\ne'), 'a\nb\nc\nd');
  assert.equal([...(normalizeStoryCaption('💪'.repeat(250)) ?? '')].length, 200);
});

test('time left is said in hours or minutes and disappears once expired', () => {
  const now = Date.parse('2026-10-18T10:00:00.000Z');
  assert.equal(storyTimeLeftLabel('2026-10-18T15:30:00.000Z', now), 'Quedan 5 h');
  assert.equal(storyTimeLeftLabel('2026-10-18T10:12:30.000Z', now), 'Quedan 12 min');
  assert.equal(storyTimeLeftLabel('2026-10-18T09:59:00.000Z', now), null);
  assert.equal(storyTimeLeftLabel(undefined, now), null);
});
