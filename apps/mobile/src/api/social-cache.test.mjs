import assert from 'node:assert/strict';
import test from 'node:test';
import { refreshSocialRelationship } from './social-cache';

test('H3.S2 refreshes every cached connection surface and the chat list after acceptance', async () => {
  const invalidated = [];
  await refreshSocialRelationship(
    { invalidateQueries: async ({ queryKey }) => { invalidated.push(queryKey); } },
    { conversations: true },
  );

  assert.deepEqual(invalidated, [
    ['social', 'directory'],
    ['social', 'connections'],
    ['social-map'],
    ['social', 'member-profile'],
    ['chat', 'conversations'],
  ]);
});

test('H3.S2 refreshes shared connection views after sending or withdrawing a request', async () => {
  const invalidated = [];
  await refreshSocialRelationship(
    { invalidateQueries: async ({ queryKey }) => { invalidated.push(queryKey); } },
    {},
  );

  assert.deepEqual(invalidated, [
    ['social', 'directory'],
    ['social', 'connections'],
    ['social-map'],
    ['social', 'member-profile'],
  ]);
});

test('H3.S2 refreshes map people and area counts without refreshing gyms or city searches', async () => {
  let mapFilters;
  await refreshSocialRelationship({
    invalidateQueries: async (filters) => { if (filters.queryKey[0] === 'social-map') mapFilters = filters; },
  });

  assert.deepEqual(mapFilters.queryKey, ['social-map']);
  assert.equal(mapFilters.predicate({ queryKey: ['social-map', 'viewer-a', 'people', 'cell-a'] }), true);
  assert.equal(mapFilters.predicate({ queryKey: ['social-map', 'viewer-a', 'areas', 'bounds-a'] }), true);
  assert.equal(mapFilters.predicate({ queryKey: ['social-map', 'registered-gyms'] }), false);
  assert.equal(mapFilters.predicate({ queryKey: ['social-map', 'cities', 'La Paz'] }), false);
});
