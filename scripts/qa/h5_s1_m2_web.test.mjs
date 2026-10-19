import assert from 'node:assert/strict';
import test from 'node:test';
import {
  runH5S1M2,
  validateEmptyDeckObservation,
} from './h5_s1_m2_web.mjs';

test('H5.S1.M2 requires the honest empty state and a route to change filters', () => {
  const complete = {
    emptyHeadingVisible: true,
    filterGuidanceVisible: true,
    communityHref: '/comunidad',
    swipeActionCount: 0,
    deckGetCount: 1,
  };
  assert.equal(validateEmptyDeckObservation(complete), true);
  for (const patch of [
    { emptyHeadingVisible: false },
    { filterGuidanceVisible: false },
    { communityHref: '/descubrir' },
    { swipeActionCount: 1 },
    { deckGetCount: 0 },
  ]) {
    assert.throws(() => validateEmptyDeckObservation({ ...complete, ...patch }));
  }
});

test('H5.S1.M2 blocks before browser or file work without QA credentials', async () => {
  await assert.rejects(runH5S1M2([
    '--case', 'H5.S1.M2', '--role', 'A_WEB', '--run-id', 'safe-run',
    '--evidence-dir', '/tmp/h5-s1-m2-evidence',
  ], {}), { name: 'PairPreconditionError' });
});
