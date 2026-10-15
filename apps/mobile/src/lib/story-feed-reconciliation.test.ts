/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import { reconcileStoryFeed } from './story-feed-reconciliation.ts';

test('keeps the active story when it remains in the refreshed feed', () => {
  assert.deepEqual(
    reconcileStoryFeed([{ userId: 'u1', stories: [{ id: 's1' }] }], { userId: 'u1', storyId: 's1' }),
    { kind: 'keep' },
  );
});

test('advances to an unseen story from the same person when the active one disappears', () => {
  assert.deepEqual(
    reconcileStoryFeed([{
      userId: 'u1',
      stories: [{ id: 'seen', viewedByMe: true }, { id: 'next', viewedByMe: false }],
    }], { userId: 'u1', storyId: 'expired' }),
    { kind: 'advance', storyId: 'next' },
  );
});

test('closes when the person or their remaining stories disappear', () => {
  assert.deepEqual(reconcileStoryFeed([], { userId: 'u1', storyId: 's1' }), { kind: 'close' });
  assert.deepEqual(
    reconcileStoryFeed([{ userId: 'u1', stories: [] }], { userId: 'u1', storyId: 's1' }),
    { kind: 'close' },
  );
});
