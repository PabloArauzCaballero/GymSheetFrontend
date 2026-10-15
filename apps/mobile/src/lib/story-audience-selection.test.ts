import assert from 'node:assert/strict';
import test from 'node:test';
import { canSubmitStoryAudience, toggleStoryAudienceRecipient } from './story-audience-selection.ts';

test('ALL_CONNECTIONS does not depend on accepted-connection loading', () => {
  assert.equal(canSubmitStoryAudience('ALL_CONNECTIONS', [], 'loading'), true);
  assert.equal(canSubmitStoryAudience('ALL_CONNECTIONS', [], 'error'), true);
});

test('selected audience stays blocked until connections load and at least one recipient is selected', () => {
  assert.equal(canSubmitStoryAudience('SELECTED_CONNECTIONS', [], 'loaded'), false);
  assert.equal(canSubmitStoryAudience('SELECTED_CONNECTIONS', ['b'], 'loading'), false);
  assert.equal(canSubmitStoryAudience('SELECTED_CONNECTIONS', ['b'], 'error'), false);
  assert.equal(canSubmitStoryAudience('SELECTED_CONNECTIONS', ['b'], 'loaded'), true);
});

test('recipient checkbox updates do not duplicate IDs', () => {
  assert.deepEqual(toggleStoryAudienceRecipient(['a'], 'b', true), ['a', 'b']);
  assert.deepEqual(toggleStoryAudienceRecipient(['a', 'b'], 'b', true), ['a', 'b']);
  assert.deepEqual(toggleStoryAudienceRecipient(['a', 'b'], 'a', false), ['b']);
});
