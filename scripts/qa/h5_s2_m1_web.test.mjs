import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isDiscoverySwipePost,
  runH5S2M1Web,
  validateKeyboardGestureObservation,
} from './h5_s2_m1_web.mjs';

test('H5.S2.M1 scopes swipe observation to the exact discovery POST', () => {
  assert.equal(isDiscoverySwipePost('POST', 'https://web.test/api/backend/me/discovery/swipes'), true);
  assert.equal(isDiscoverySwipePost('GET', 'https://web.test/api/backend/me/discovery/swipes'), false);
  assert.equal(isDiscoverySwipePost('POST', 'https://web.test/api/backend/me/discovery/swipes/undo'), false);
  assert.equal(isDiscoverySwipePost('POST', 'https://web.test/api/backend/me/discovery/swipes-extra'), false);
});

test('H5.S2.M1 requires keyboard focus and identical LIKE payloads for both actions', () => {
  const candidateId = '00000000-0000-4000-8000-000000000001';
  const payload = { targetId: candidateId, direction: 'LIKE' };
  const complete = {
    candidateId,
    candidateVisibleBeforeKeyboard: true,
    keyboardButtonFocused: true,
    keyboardFocusVisible: true,
    candidateRemovedWhileKeyboardPending: true,
    keyboardStatus: 503,
    candidateRestoredAfterKeyboardError: true,
    gestureStatus: 200,
    candidateRemovedAfterGesture: true,
    swipePostCount: 2,
    payloads: [payload, payload],
  };
  assert.equal(validateKeyboardGestureObservation(complete), true);
  for (const patch of [
    { keyboardButtonFocused: false },
    { keyboardFocusVisible: false },
    { candidateRemovedWhileKeyboardPending: false },
    { keyboardStatus: 200 },
    { candidateRestoredAfterKeyboardError: false },
    { gestureStatus: 503 },
    { candidateRemovedAfterGesture: false },
    { swipePostCount: 1 },
    { payloads: [payload, { ...payload, direction: 'PASS' }] },
    { payloads: [payload, { ...payload, targetId: 'different-candidate' }] },
    { payloads: [payload, { ...payload, source: 'unexpected' }] },
  ]) {
    assert.throws(() => validateKeyboardGestureObservation({ ...complete, ...patch }));
  }
});

test('H5.S2.M1 blocks before browser or file work when QA credentials are absent', async () => {
  await assert.rejects(runH5S2M1Web([
    '--case', 'H5.S2.M1', '--role', 'A_WEB', '--run-id', 'safe-run',
    '--evidence-dir', '/tmp/h5-s2-m1-evidence',
  ], {}), { name: 'PairPreconditionError' });
});
