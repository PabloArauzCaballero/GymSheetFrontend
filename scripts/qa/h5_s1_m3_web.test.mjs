import assert from 'node:assert/strict';
import test from 'node:test';
import {
  connectionSnapshotFor,
  isDiscoverySwipeConflict,
  isDiscoverySwipePost,
  runH5S1M3,
  validateConflictObservation,
} from './h5_s1_m3_web.mjs';

test('H5.S1.M3 scopes the controlled response to discovery swipe POST', () => {
  assert.equal(isDiscoverySwipePost('POST', 'https://web.test/api/backend/me/discovery/swipes'), true);
  assert.equal(isDiscoverySwipePost('GET', 'https://web.test/api/backend/me/discovery/swipes'), false);
  assert.equal(isDiscoverySwipePost('POST', 'https://web.test/api/backend/me/discovery/swipes/undo'), false);
  assert.equal(isDiscoverySwipePost('POST', 'https://web.test/api/backend/me/discovery/swipes-extra'), false);
});

test('H5.S1.M3 starts reconciliation only after the exact swipe responds with 409', () => {
  assert.equal(isDiscoverySwipeConflict('POST', 'https://web.test/api/backend/me/discovery/swipes', 409), true);
  assert.equal(isDiscoverySwipeConflict('POST', 'https://web.test/api/backend/me/discovery/swipes', 503), false);
  assert.equal(isDiscoverySwipeConflict('POST', 'https://web.test/api/backend/me/discovery/swipes/undo', 409), false);
});

test('H5.S1.M3 reads a complete connection snapshot using GET', async () => {
  let request;
  const snapshot = await connectionSnapshotFor('https://api.test/api/v1', 'private-token',
    async (url, options) => {
      request = { url, options };
      return new Response(JSON.stringify({ ok: true, data: [
        { id: '00000000-0000-4000-8000-000000000011', otherUserId: '00000000-0000-4000-8000-000000000001', status: 'PENDING' },
        { id: '00000000-0000-4000-8000-000000000012', otherUserId: '00000000-0000-4000-8000-000000000002', status: 'ACCEPTED' },
      ] }), { status: 200 });
    });
  assert.deepEqual(snapshot, [
    { id: '00000000-0000-4000-8000-000000000011', otherUserId: '00000000-0000-4000-8000-000000000001', status: 'PENDING' },
    { id: '00000000-0000-4000-8000-000000000012', otherUserId: '00000000-0000-4000-8000-000000000002', status: 'ACCEPTED' },
  ]);
  assert.equal(request.url, 'https://api.test/api/v1/me/connections');
  assert.equal(request.options.method, 'GET');
});

test('H5.S1.M3 requires a post-conflict deck refetch and unchanged connection snapshot', () => {
  const complete = {
    candidateVisibleBeforeSwipe: true,
    swipePostCount: 1,
    conflictStatus: 409,
    candidateVisibleAfterReconciliation: false,
    reconciliationDeckGetCount: 1,
    connectionSnapshotBefore: [{ id: 'connection-1', otherUserId: 'member-1', status: 'PENDING' }],
    connectionSnapshotAfter: [{ id: 'connection-1', otherUserId: 'member-1', status: 'PENDING' }],
  };
  assert.equal(validateConflictObservation(complete), true);
  for (const patch of [
    { candidateVisibleBeforeSwipe: false },
    { swipePostCount: 0 },
    { conflictStatus: 500 },
    { candidateVisibleAfterReconciliation: true },
    { reconciliationDeckGetCount: 0 },
    { connectionSnapshotAfter: [{ id: 'new-connection', otherUserId: 'member-1', status: 'PENDING' }] },
  ]) {
    assert.throws(() => validateConflictObservation({ ...complete, ...patch }));
  }
});

test('H5.S1.M3 blocks before browser or file work when QA credentials are absent', async () => {
  await assert.rejects(runH5S1M3([
    '--case', 'H5.S1.M3', '--role', 'A_WEB', '--run-id', 'safe-run',
    '--evidence-dir', '/tmp/h5-s1-m3-evidence',
  ], {}), { name: 'PairPreconditionError' });
});
