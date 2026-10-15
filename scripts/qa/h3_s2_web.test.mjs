import test from 'node:test';
import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import {
  apiData, dismissTour, findConnection, fixtureFor, parseArgs, precondition,
} from './h3_s2_web.mjs';

const idA = '11111111-1111-4111-8111-111111111111';
const idB = '22222222-2222-4222-8222-222222222222';
const connectionId = '33333333-3333-4333-8333-333333333333';

test('every registered H3.S2 PAIR role has a fixed runner entrypoint', async () => {
  const roles = {
    'H3.S2.M1': ['A_WEB', 'B_WEB'], 'H3.S2.M2': ['A_WEB', 'B_WEB'],
    'H3.S2.M3': ['A_WEB', 'B_WEB'], 'H3.S2.M4': ['A_WEB'],
  };
  const folder = new URL('./drivers/', import.meta.url);
  for (const [caseId, caseRoles] of Object.entries(roles)) {
    for (const role of caseRoles) await access(new URL(`${caseId}-${role}.py`, folder));
  }
});

test('accepts only registered H3.S2 role/case and safe run IDs', () => {
  assert.equal(parseArgs(['--case', 'H3.S2.M1', '--role', 'A_WEB', '--run-id', 'run-9', '--evidence-dir', '/tmp/e']).runId, 'run-9');
  assert.throws(() => parseArgs(['--case', 'H3.S2.M1', '--role', 'B_WEB', '--run-id', '../bad', '--evidence-dir', '/tmp/e']));
  assert.throws(() => parseArgs(['--case', 'H3.S2.M4', '--role', 'B_WEB', '--run-id', 'ok', '--evidence-dir', '/tmp/e']));
  assert.throws(() => parseArgs(['--case', 'H3.S2.M1', '--role', 'A_WEB', '--role', 'B_WEB', '--run-id', 'ok', '--evidence-dir', '/tmp/e']));
});

test('requires explicit case ACK and exact disposable connection IDs before actions', () => {
  assert.throws(() => fixtureFor('H3.S2.M1', 'B_WEB', {}), (error) => error.name === 'PairPreconditionError');
  assert.throws(() => fixtureFor('H3.S2.M2', 'A_WEB', {
    QA_H3_M2_PAIR_ACK: 'H3.S2.M2', QA_H3_M2_CONNECTION_ID: 'not-a-uuid',
  }), (error) => error.name === 'PairPreconditionError');
  assert.deepEqual(fixtureFor('H3.S2.M1', 'B_WEB', {
    QA_H3_M1_PAIR_ACK: 'H3.S2.M1', QA_H3_M1_CONNECTION_ID: connectionId,
  }), { actor: 'B', connectionId });
  assert.equal(fixtureFor('H3.S2.M4', 'A_WEB', {
    QA_H3_M4_PAIR_ACK: 'H3.S2.M4', QA_H3_M4_TARGET_USER_ID: idB,
  }).targetUserId, idB);
});

test('uses the role token and unwraps only a successful API envelope', async () => {
  let requested;
  const data = await apiData('https://qa.example/api/v1', 'role-secret', '/auth/me', {}, async (url, options) => {
    requested = { url: String(url), authorization: options.headers.authorization };
    return new Response(JSON.stringify({ ok: true, data: { id: idA } }), { status: 200 });
  });
  assert.deepEqual(data, { id: idA });
  assert.equal(requested.url, 'https://qa.example/api/v1/auth/me');
  assert.equal(requested.authorization, 'Bearer role-secret');
  await assert.rejects(apiData('https://qa.example/api/v1', 'secret', '/auth/me', {}, async () =>
    new Response(JSON.stringify({ ok: false, data: {} }), { status: 200 })));
});

test('validates the exact fixture, status, and peer before proceeding', () => {
  const rows = [{ id: connectionId, status: 'PENDING', otherUserId: idB, direction: 'RECEIVED' }];
  assert.equal(findConnection(rows, connectionId, 'PENDING', idB), rows[0]);
  assert.throws(() => findConnection(rows, connectionId, 'ACCEPTED', idB));
  assert.throws(() => findConnection(rows, connectionId, 'PENDING', idA));
  assert.throws(() => findConnection([...rows, ...rows], connectionId, 'PENDING', idB));
});

test('precondition errors have the runner BLOCKED exit semantics', () => {
  assert.equal(precondition('missing dedicated fixture').name, 'PairPreconditionError');
});

test('dismisses a delayed tutorial with normal clicks and confirms omission', async () => {
  const clicks = [];
  const close = {
    waitFor: async () => {}, isVisible: async () => true,
    click: async (...args) => { clicks.push(['close', ...args]); },
  };
  const confirmButton = { click: async (...args) => { clicks.push(['confirm', ...args]); } };
  const confirmation = {
    isVisible: async () => true,
    getByRole: (role, options) => {
      assert.equal(role, 'button');
      assert.deepEqual(options, { name: 'Omitir tutorial', exact: true });
      return confirmButton;
    },
  };
  const page = {
    getByRole: (role, options) => {
      if (role === 'button') {
        assert.match(String(options.name), /Cerrar tutorial\|Omitir/u);
        return { first: () => close };
      }
      assert.equal(role, 'alertdialog');
      return confirmation;
    },
  };
  assert.equal(await dismissTour(page), true);
  assert.deepEqual(clicks, [['close'], ['confirm']]);
  assert.equal(await dismissTour({
    getByRole: () => ({ first: () => ({
      waitFor: async () => { throw new Error('not present'); },
      isVisible: async () => false,
    }) }),
  }), false);
});
