import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isDiscoverySwipePost,
  runH5S1M4,
  validateReturnObservation,
} from './h5_s1_m4_web.mjs';

test('H5.S1.M4 scopes its controlled success to discovery swipe POST', () => {
  assert.equal(isDiscoverySwipePost('POST', 'https://web.test/api/backend/me/discovery/swipes'), true);
  assert.equal(isDiscoverySwipePost('GET', 'https://web.test/api/backend/me/discovery/swipes'), false);
  assert.equal(isDiscoverySwipePost('POST', 'https://web.test/api/backend/me/discovery/swipes/undo'), false);
});

test('H5.S1.M4 requires a cursor-free deck request after returning to discovery', () => {
  const complete = {
    initialDeckGetCount: 1,
    swipePostCount: 1,
    swipeStatus: 200,
    postSwipeDeckGetCount: 1,
    returnDeckGetCount: 1,
    returnDeckHadCursor: false,
    communityHeadingVisible: true,
    emptyHeadingVisible: true,
    candidateVisibleAfterReturn: false,
    swipeWasIntercepted: true,
  };
  assert.equal(validateReturnObservation(complete), true);
  for (const patch of [
    { initialDeckGetCount: 0 },
    { swipePostCount: 0 },
    { swipeStatus: 409 },
    { postSwipeDeckGetCount: 0 },
    { returnDeckGetCount: 0 },
    { returnDeckHadCursor: true },
    { communityHeadingVisible: false },
    { emptyHeadingVisible: false },
    { candidateVisibleAfterReturn: true },
    { swipeWasIntercepted: false },
  ]) {
    assert.throws(() => validateReturnObservation({ ...complete, ...patch }));
  }
});

test('H5.S1.M4 blocks before browser or file work when QA credentials are absent', async () => {
  await assert.rejects(runH5S1M4([
    '--case', 'H5.S1.M4', '--role', 'A_WEB', '--run-id', 'safe-run',
    '--evidence-dir', '/tmp/h5-s1-m4-evidence',
  ], {}), { name: 'PairPreconditionError' });
});
