import assert from 'node:assert/strict';
import test from 'node:test';
import {
  authenticateActor,
  isDiscoveryDeckGet,
  openDiscoveryPage,
  runH5S1M1,
  validateRecoveryObservation,
} from './h5_s1_m1_web.mjs';

test('web driver scopes the synthetic response to the discovery deck GET', () => {
  assert.equal(isDiscoveryDeckGet('GET', 'https://web.test/api/backend/me/discovery/deck?limit=12'), true);
  assert.equal(isDiscoveryDeckGet('POST', 'https://web.test/api/backend/me/discovery/deck'), false);
  assert.equal(isDiscoveryDeckGet('GET', 'https://web.test/api/backend/me/discovery/swipes'), false);
  assert.equal(isDiscoveryDeckGet('GET', 'https://web.test/api/backend/me/discovery/deck-extra'), false);
});

test('web driver authenticates A through the API without following bearer redirects', async () => {
  let request;
  const actor = await authenticateActor('https://api.test/api/v1', 'private-token',
    async (url, options) => {
      request = { url, options };
      return new Response(JSON.stringify({ ok: true, data: {
        id: '11111111-1111-4111-8111-111111111111',
      } }), { status: 200 });
    });

  assert.equal(actor.id, '11111111-1111-4111-8111-111111111111');
  assert.equal(request.url, 'https://api.test/api/v1/auth/me');
  assert.equal(request.options.headers.Authorization, 'Bearer private-token');
  assert.equal(request.options.redirect, 'error');
  await assert.rejects(authenticateActor('https://api.test/api/v1', 'private-token',
    async () => new Response('', { status: 302, headers: { location: 'https://elsewhere.test' } })));
});

test('web driver blocks before browser or file work when QA credentials are absent', async () => {
  await assert.rejects(runH5S1M1([
    '--case', 'H5.S1.M1', '--role', 'A_WEB', '--run-id', 'safe-run',
    '--evidence-dir', '/tmp/h5-s1-m1-evidence',
  ], {}), { name: 'PairPreconditionError' });
});

test('web navigation outage is blocked while an unexpected redirect remains a failure', async () => {
  await assert.rejects(openDiscoveryPage({
    goto: async () => { throw new Error('connection refused'); },
    url: () => 'http://web.test/descubrir',
  }, 'http://web.test/descubrir'), { name: 'PairPreconditionError' });
  await assert.rejects(openDiscoveryPage({
    goto: async () => undefined,
    url: () => 'http://web.test/login',
  }, 'http://web.test/descubrir'), /did not open the authenticated discovery page/u);
});

test('H5.S1.M1 recovery requires an alert, hidden corrupt candidate, retry request and valid card', () => {
  const complete = {
    errorAlertContainsContractMessage: true,
    corruptCandidateCount: 0,
    retryButtonVisible: true,
    initialDeckGets: 1,
    retryDeckGets: 1,
    recoveredCandidateVisible: true,
  };
  assert.equal(validateRecoveryObservation(complete), true);
  for (const patch of [
    { errorAlertContainsContractMessage: false },
    { corruptCandidateCount: 1 },
    { retryButtonVisible: false },
    { retryDeckGets: 0 },
    { recoveredCandidateVisible: false },
  ]) {
    assert.throws(() => validateRecoveryObservation({ ...complete, ...patch }));
  }
});
