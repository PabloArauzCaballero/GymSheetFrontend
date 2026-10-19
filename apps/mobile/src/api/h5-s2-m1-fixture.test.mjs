import assert from 'node:assert/strict';
import test from 'node:test';
import { createH5S2M1FixtureFetch, isH5S2M1FixtureEnabled } from './h5-s2-m1-fixture';

const baseUrl = 'https://api.test/api/v1';
const candidateId = '00000000-0000-4000-8000-000000000001';

test('fixture serves a candidate and controls only the two exact discovery swipes', async () => {
  const forwarded = [];
  const fixture = createH5S2M1FixtureFetch({
    enabled: true,
    baseUrl,
    fetchImpl: async (input) => {
      forwarded.push(String(input));
      return new Response('{}');
    },
    pendingMs: 0,
  });

  const deck = await fixture.fetch(`${baseUrl}/me/discovery/deck?limit=10`);
  assert.equal(deck.status, 200);
  assert.equal((await deck.json()).data[0].userId, candidateId);

  const payload = JSON.stringify({ targetId: candidateId, direction: 'LIKE' });
  const first = await fixture.fetch(`${baseUrl}/me/discovery/swipes`, {
    method: 'POST', body: payload,
  });
  assert.equal(first.status, 503);
  assert.equal(fixture.snapshot().requestCount, 1);

  const second = await fixture.fetch(`${baseUrl}/me/discovery/swipes`, {
    method: 'POST', body: payload,
  });
  assert.equal(second.status, 200);
  assert.equal((await second.json()).data.targetId, candidateId);
  assert.deepEqual(fixture.snapshot(), {
    enabled: true, requestCount: 2, completed: true, phase: 'complete',
  });
  assert.deepEqual(forwarded, []);

  const emptyDeck = await fixture.fetch(`${baseUrl}/me/discovery/deck`);
  assert.deepEqual((await emptyDeck.json()).data, []);
});

test('fixture rejects unexpected swipe method, payload, and extra swipe without forwarding', async () => {
  let forwarded = 0;
  const fixture = createH5S2M1FixtureFetch({
    enabled: true, baseUrl, pendingMs: 0,
    fetchImpl: async () => { forwarded += 1; return new Response('{}'); },
  });
  const endpoint = `${baseUrl}/me/discovery/swipes`;
  for (const init of [
    { method: 'GET' },
    { method: 'POST', body: JSON.stringify({ targetId: candidateId, direction: 'PASS' }) },
    { method: 'POST', body: JSON.stringify({ targetId: candidateId, direction: 'LIKE', extra: true }) },
  ]) {
    await assert.rejects(fixture.fetch(endpoint, init), /H5\.S2\.M1 fixture rejected/);
  }
  const valid = { method: 'POST', body: JSON.stringify({ targetId: candidateId, direction: 'LIKE' }) };
  assert.equal((await fixture.fetch(endpoint, valid)).status, 503);
  assert.equal((await fixture.fetch(endpoint, valid)).status, 200);
  await assert.rejects(fixture.fetch(endpoint, valid), /H5\.S2\.M1 fixture rejected/);
  assert.equal(forwarded, 0);
});

test('fixture stays completely inert unless the development guard is true', async () => {
  let forwarded = 0;
  const fetchImpl = async () => { forwarded += 1; return new Response('live'); };
  for (const enabled of [false, undefined]) {
    const fixture = createH5S2M1FixtureFetch({ enabled, baseUrl, fetchImpl });
    assert.equal(await (await fixture.fetch(`${baseUrl}/me/discovery/swipes`, {
      method: 'POST', body: JSON.stringify({ targetId: candidateId, direction: 'LIKE' }),
    })).text(), 'live');
    assert.deepEqual(fixture.snapshot(), {
      enabled: false, requestCount: 0, completed: false, phase: 'disabled',
    });
  }
  assert.equal(forwarded, 2);
});

test('fixture opt-in requires both development mode and the exact flag', () => {
  assert.equal(isH5S2M1FixtureEnabled(true, '1'), true);
  assert.equal(isH5S2M1FixtureEnabled(false, '1'), false);
  assert.equal(isH5S2M1FixtureEnabled(true, undefined), false);
  assert.equal(isH5S2M1FixtureEnabled(true, 'true'), false);
});

test('fixture scopes matching to the configured API origin and exact paths', async () => {
  let forwarded = 0;
  const fixture = createH5S2M1FixtureFetch({
    enabled: true, baseUrl, pendingMs: 0,
    fetchImpl: async () => { forwarded += 1; return new Response('live'); },
  });
  await fixture.fetch('https://other.test/api/v1/me/discovery/swipes', { method: 'POST' });
  await fixture.fetch(`${baseUrl}/me/discovery/swipes/undo`, { method: 'POST' });
  assert.equal(forwarded, 2);
  assert.equal(fixture.snapshot().requestCount, 0);
});

test('fixture rejects a concurrent swipe so the first response remains the controlled 503', async () => {
  const fixture = createH5S2M1FixtureFetch({
    enabled: true, baseUrl, pendingMs: 40,
    fetchImpl: async () => new Response('{}'),
  });
  const endpoint = `${baseUrl}/me/discovery/swipes`;
  const payload = JSON.stringify({ targetId: candidateId, direction: 'LIKE' });
  const first = fixture.fetch(endpoint, { method: 'POST', body: payload });
  while (fixture.snapshot().requestCount === 0) {
    await new Promise((resolve) => setImmediate(resolve));
  }
  await assert.rejects(
    fixture.fetch(endpoint, { method: 'POST', body: payload }),
    /H5\.S2\.M1 fixture rejected/,
  );
  assert.equal((await first).status, 503);
  assert.equal(fixture.snapshot().phase, 'rollback');
});
