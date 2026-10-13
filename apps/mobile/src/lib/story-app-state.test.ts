/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import { storyManualPauseAfterAppStateChange } from './story-app-state.ts';

test('pauses a story when the app leaves the foreground', () => {
  assert.equal(storyManualPauseAfterAppStateChange(false, 'background'), true);
  assert.equal(storyManualPauseAfterAppStateChange(false, 'inactive'), true);
});

test('returning to active does not resume a story automatically', () => {
  assert.equal(storyManualPauseAfterAppStateChange(true, 'active'), true);
});

test('active app state does not pause a story that was not paused', () => {
  assert.equal(storyManualPauseAfterAppStateChange(false, 'active'), false);
});
