/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import { adjacentPersonStep, nextStoryStep, previousStoryStep, storiesToPreload } from './story-navigation.ts';

const feed = [
  { userId: 'me', stories: [{ id: 'm1', viewedByMe: true }] },
  { userId: 'ana', stories: [{ id: 'a1', viewedByMe: true }, { id: 'a2', viewedByMe: false }] },
  { userId: 'empty', stories: [] },
  { userId: 'bea', stories: [{ id: 'b1', viewedByMe: false }, { id: 'b2', viewedByMe: false }] },
];

test('next goes to the following story of the same person, then to the next person with content', () => {
  assert.deepEqual(nextStoryStep(feed, { userId: 'ana', storyId: 'a1' }), { userId: 'ana', storyId: 'a2', changedPerson: false });
  assert.deepEqual(nextStoryStep(feed, { userId: 'ana', storyId: 'a2' }), { userId: 'bea', storyId: 'b1', changedPerson: true });
  assert.equal(nextStoryStep(feed, { userId: 'bea', storyId: 'b2' }), null);
});

test('previous enters the previous person by their last story and returns null at the very first', () => {
  assert.deepEqual(previousStoryStep(feed, { userId: 'bea', storyId: 'b1' }), { userId: 'ana', storyId: 'a2', changedPerson: true });
  assert.deepEqual(previousStoryStep(feed, { userId: 'ana', storyId: 'a2' }), { userId: 'ana', storyId: 'a1', changedPerson: false });
  assert.equal(previousStoryStep(feed, { userId: 'me', storyId: 'm1' }), null);
});

test('swiping to another person enters by their first unviewed story and skips empty entries', () => {
  assert.deepEqual(adjacentPersonStep(feed, 'me', 1), { userId: 'ana', storyId: 'a2', changedPerson: true });
  assert.deepEqual(adjacentPersonStep(feed, 'bea', -1), { userId: 'ana', storyId: 'a2', changedPerson: true });
  assert.equal(adjacentPersonStep(feed, 'bea', 1), null);
  assert.equal(adjacentPersonStep(feed, 'nobody', 1), null);
});

test('preloads the next story and the next person without duplicates', () => {
  assert.deepEqual(storiesToPreload(feed, { userId: 'ana', storyId: 'a1' }).map((story) => story.id), ['a2', 'b1']);
  assert.deepEqual(storiesToPreload(feed, { userId: 'ana', storyId: 'a2' }).map((story) => story.id), ['b1']);
  assert.deepEqual(storiesToPreload(feed, { userId: 'bea', storyId: 'b2' }), []);
});
