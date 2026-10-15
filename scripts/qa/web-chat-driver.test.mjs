import assert from 'node:assert/strict';
import test from 'node:test';
import { access, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  arriveAtBarrier,
  assertEditedOwnedMessage,
  pairActorIds,
  assertDisposableConversation,
  assertM4RestorableSettings,
  assertM4ReceiptSettings,
  assertM4PeerReceiptsEnabled,
  findReservedPairConversation,
  startPairConversation,
  apiData,
  findOwnedRunMessage,
  fixtureBodies,
  remainingMs,
  assertM5DisposablePair,
  findM5ReservedConversation,
  findM5ReservedConnection,
  validateM5History,
  apiStatus,
  assertM5ConnectionRevoked,
} from './web-chat-driver.mjs';

const identity = {
  runId: 'run-123',
  case: 'H7.S4.M3',
  expectedRoles: ['A_IOS', 'B_WEB'],
  expectedActorIds: { A_IOS: 'actor-a', B_WEB: 'actor-b' },
  invocationId: '0123456789abcdef0123456789abcdef',
};

test('M5 requires exact disposable conversation and accepted-connection reservations', () => {
  const conversationId = '11111111-1111-4111-8111-111111111111';
  const connectionId = '22222222-2222-4222-8222-222222222222';
  assert.deepEqual(assertM5DisposablePair(conversationId, connectionId,
    conversationId, connectionId), { conversationId, connectionId });
  assert.throws(() => assertM5DisposablePair(conversationId, connectionId,
    conversationId, '33333333-3333-4333-8333-333333333333'), /does not match/);
  assert.throws(() => assertM5DisposablePair('invalid', connectionId,
    'invalid', connectionId), /UUID/);
});

test('M5 resolves exactly one active conversation and accepted connection for its peer', () => {
  const conversationId = '11111111-1111-4111-8111-111111111111';
  const connectionId = '22222222-2222-4222-8222-222222222222';
  assert.equal(findM5ReservedConversation([{
    conversationId, otherUserId: 'actor-a', systemKind: null, canWrite: true,
  }], 'actor-a', conversationId), conversationId);
  assert.equal(findM5ReservedConnection([{
    id: connectionId, otherUserId: 'actor-a', status: 'ACCEPTED',
  }], 'actor-a', connectionId), connectionId);
  assert.throws(() => findM5ReservedConversation([], 'actor-a', conversationId), /exactly one/);
  assert.throws(() => findM5ReservedConnection([{
    id: connectionId, otherUserId: 'actor-a', status: 'PENDING',
  }], 'actor-a', connectionId), /accepted/);
});

test('M5 postcondition requires the reserved accepted connection to be gone', () => {
  const connectionId = '22222222-2222-4222-8222-222222222222';
  assert.equal(assertM5ConnectionRevoked([], 'actor-a', connectionId), true);
  assert.throws(() => assertM5ConnectionRevoked([{
    id: connectionId, otherUserId: 'actor-a', status: 'ACCEPTED',
  }], 'actor-a', connectionId), /connection remains/);
  assert.throws(() => assertM5ConnectionRevoked([{
    id: '33333333-3333-4333-8333-333333333333', otherUserId: 'actor-a', status: 'ACCEPTED',
  }], 'actor-a', connectionId), /connection remains/);
});

test('M5 refuses to revoke until the reserved pair has both text and downloadable image records', () => {
  const conversationId = '11111111-1111-4111-8111-111111111111';
  const rows = [
    { id: 'text', conversationId, type: 'text', body: 'before revoke' },
    { id: 'image', conversationId, type: 'image', mediaUrl: '/media/private' },
  ];
  assert.deepEqual(validateM5History(rows, conversationId), {
    textBody: 'before revoke', imageMessageId: 'image',
    mediaEndpoint: `/me/conversations/${conversationId}/messages/image/media`,
  });
  assert.throws(() => validateM5History(rows.slice(0, 1), conversationId), /image/);
  assert.throws(() => validateM5History([
    ...rows, { ...rows[1], id: 'foreign', conversationId: 'other' },
  ], conversationId), /another conversation/);
});

test('M5 API status helper sends only the assigned actor bearer and preserves 404', async () => {
  let received;
  const status = await apiStatus('http://127.0.0.1:3011/api/v1', 'token-b',
    '/me/conversations/c/messages', {}, async (url, options) => {
      received = { url: String(url), options };
      return new Response('', { status: 404 });
    });
  assert.equal(status, 404);
  assert.equal(received.url, 'http://127.0.0.1:3011/api/v1/me/conversations/c/messages');
  assert.equal(received.options.headers.Authorization, 'Bearer token-b');
});

test('binds the current browser role to its assigned actor and exact pair', () => {
  assert.deepEqual(pairActorIds(identity, 'run-123', 'H7.S4.M3', 'B_WEB', 'actor-b',
    ['A_IOS', 'B_WEB']), { actorId: 'actor-b', peerId: 'actor-a' });
  assert.throws(() => pairActorIds(identity, 'run-123', 'H7.S4.M3', 'B_WEB', 'actor-a',
    ['A_IOS', 'B_WEB']), /actor identity/);
  assert.throws(() => pairActorIds(identity, 'old-run', 'H7.S4.M3', 'B_WEB', 'actor-b',
    ['A_IOS', 'B_WEB']), /barrier identity/);
});

test('requires M4 to match an explicitly reserved disposable conversation', () => {
  const conversationId = '11111111-1111-4111-8111-111111111111';
  assert.equal(assertDisposableConversation(conversationId, conversationId), conversationId);
  assert.throws(() => assertDisposableConversation(conversationId, undefined), /reserved/);
  assert.throws(() => assertDisposableConversation(conversationId,
    '22222222-2222-4222-8222-222222222222'), /does not match/);
  assert.throws(() => assertDisposableConversation('not-a-uuid', 'not-a-uuid'), /UUID/);
});

test('M4 only mutates a preference whose explicit true value is known and restorable', () => {
  assert.equal(assertM4RestorableSettings({ enabled: true, conversationOverride: true,
    defaultEnabled: false, version: 4 }).version, 4);
  assert.throws(() => assertM4RestorableSettings({ enabled: true,
    conversationOverride: null, defaultEnabled: true, version: 4 }), /explicitly enabled/);
  assert.throws(() => assertM4RestorableSettings({ enabled: false,
    conversationOverride: false, defaultEnabled: true, version: 4 }), /explicitly enabled/);
  assert.equal(assertM4ReceiptSettings({ enabled: false, conversationOverride: false },
    false, false), true);
  assert.throws(() => assertM4ReceiptSettings({ enabled: true, conversationOverride: true },
    false, false), /did not reach/);
});

test('M4 requires B to permit receipts before sending the baseline fixture', () => {
  assert.equal(assertM4PeerReceiptsEnabled({ enabled: true, conversationOverride: null }), true);
  assert.throws(() => assertM4PeerReceiptsEnabled({ enabled: false,
    conversationOverride: false }), /B must enable/);
});

test('M4 resolves only an existing reserved conversation with the assigned peer', () => {
  const reserved = '11111111-1111-4111-8111-111111111111';
  const rows = [
    { conversationId: reserved, otherUserId: 'actor-b', systemKind: null, canWrite: true },
    { conversationId: '22222222-2222-4222-8222-222222222222', otherUserId: 'actor-c',
      systemKind: null, canWrite: true },
  ];
  assert.equal(findReservedPairConversation(rows, 'actor-b', reserved), reserved);
  assert.throws(() => findReservedPairConversation(rows, 'actor-x', reserved), /reserved/);
  assert.throws(() => findReservedPairConversation([
    ...rows, { conversationId: reserved, otherUserId: 'actor-b', systemKind: null, canWrite: true },
  ], 'actor-b', reserved), /exactly once/);
});

test('binds repeated H7.M4 roles to exactly two distinct actors', () => {
  const m4 = {
    runId: 'run-123',
    case: 'H7.S4.M4',
    expectedRoles: ['A_ANDROID', 'A_IOS', 'A_WEB', 'B_WEB'],
    expectedActorIds: {
      A_ANDROID: 'actor-a', A_IOS: 'actor-a', A_WEB: 'actor-a', B_WEB: 'actor-b',
    },
    invocationId: identity.invocationId,
  };
  const roles = ['A_ANDROID', 'A_IOS', 'A_WEB', 'B_WEB'];
  assert.deepEqual(pairActorIds(m4, 'run-123', 'H7.S4.M4', 'A_WEB', 'actor-a', roles),
    { actorId: 'actor-a', peerId: 'actor-b' });
  assert.deepEqual(pairActorIds(m4, 'run-123', 'H7.S4.M4', 'B_WEB', 'actor-b', roles),
    { actorId: 'actor-b', peerId: 'actor-a' });
  assert.throws(() => pairActorIds({ ...m4, expectedActorIds: {
    ...m4.expectedActorIds, A_IOS: 'actor-c',
  } }, 'run-123', 'H7.S4.M4', 'A_WEB', 'actor-a', roles), /exactly two distinct/);
  assert.throws(() => pairActorIds({ ...m4, expectedActorIds: {
    ...m4.expectedActorIds, B_WEB: 'actor-a',
  } }, 'run-123', 'H7.S4.M4', 'A_WEB', 'actor-a', roles), /exactly two distinct/);
});

test('starts only the conversation with the assigned peer using its own token', async () => {
  let received;
  const fetchImpl = async (url, options) => {
    received = { url: String(url), options };
    return new Response(JSON.stringify({ ok: true, data: {
      conversationId: '11111111-1111-4111-8111-111111111111',
    } }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  const id = await startPairConversation('http://127.0.0.1:3011/api/v1', 'token-b',
    'actor-a', fetchImpl);
  assert.equal(id, '11111111-1111-4111-8111-111111111111');
  assert.equal(received.url, 'http://127.0.0.1:3011/api/v1/me/conversations');
  assert.equal(received.options.headers.Authorization, 'Bearer token-b');
  assert.deepEqual(JSON.parse(received.options.body), { otherUserId: 'actor-a' });
});

test('only a denied pair-creation precondition is classified as BLOCKED', async () => {
  const denied = async () => new Response(JSON.stringify({ ok: false }), { status: 403 });
  await assert.rejects(apiData('http://127.0.0.1:3011/api/v1', 'token-a',
    '/me/chat/read-receipts', {}, denied), (error) => error.name !== 'PairPreconditionError');
  await assert.rejects(startPairConversation('http://127.0.0.1:3011/api/v1', 'token-a',
    'actor-b', denied), (error) => error.name === 'PairPreconditionError');
});

test('selects only a message with exact run body, conversation, and author', () => {
  const messages = [
    { id: 'wrong-author', conversationId: 'conv-1', senderId: 'actor-b', body: 'run text' },
    { id: 'wrong-conversation', conversationId: 'conv-2', senderId: 'actor-a', body: 'run text' },
    { id: 'owned', conversationId: 'conv-1', senderId: 'actor-a', body: 'run text' },
  ];
  assert.equal(findOwnedRunMessage(messages, 'conv-1', 'actor-a', 'run text').id, 'owned');
  assert.equal(findOwnedRunMessage(messages, 'conv-1', 'actor-a', 'different text'), null);
});

test('requires the edited body to belong to the original fixture message', () => {
  const seeded = { id: 'message-a', body: 'original' };
  assert.equal(assertEditedOwnedMessage(seeded,
    { id: 'message-a', body: 'edited', editedAt: '2026-10-09T10:00:00Z' }, 'edited'), true);
  assert.throws(() => assertEditedOwnedMessage(seeded,
    { id: 'message-b', body: 'edited', editedAt: '2026-10-09T10:00:00Z' }, 'edited'), /same message/);
});

test('fixture message bodies change for every invocation even when run id is reused', () => {
  const first = fixtureBodies('same-run', identity.invocationId);
  const second = fixtureBodies('same-run', 'fedcba9876543210fedcba9876543210');
  assert.notEqual(first.originalBody, second.originalBody);
  assert.notEqual(first.editedBody, second.editedBody);
});

test('shared role deadline reports only the remaining budget and rejects expiration', () => {
  assert.equal(remainingMs(5_000, 4_200), 800);
  assert.throws(() => remainingMs(5_000, 5_000), /deadline/);
});

test('uses the same atomic run-scoped barrier protocol as native role helpers', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'gymsheet-web-barrier-'));
  const barrierDir = path.join(root, 'barrier');
  await mkdir(barrierDir);
  await writeFile(path.join(barrierDir, '.barrier.json'), JSON.stringify(identity));
  try {
    const shared = { evidenceDir: root, barrierDir, runId: 'run-123', case: 'H7.S4.M3',
      roles: ['A_IOS', 'B_WEB'], timeoutMs: 500, interval: 5 };
    const a = arriveAtBarrier({ ...shared, role: 'A_IOS', actorId: 'actor-a', name: 'ready' });
    const b = arriveAtBarrier({ ...shared, role: 'B_WEB', actorId: 'actor-b', name: 'ready' });
    assert.deepEqual(await a, ['A_IOS', 'B_WEB']);
    assert.deepEqual(await b, ['A_IOS', 'B_WEB']);
    for (const role of ['A_IOS', 'B_WEB']) {
      const marker = JSON.parse(await readFile(path.join(barrierDir, `ready--${role}.json`), 'utf8'));
      assert.equal(marker.invocationId, identity.invocationId);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('rejects wrong role actors and duplicate arrivals before releasing a barrier', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'gymsheet-web-barrier-'));
  const barrierDir = path.join(root, 'barrier');
  await mkdir(barrierDir);
  await writeFile(path.join(barrierDir, '.barrier.json'), JSON.stringify(identity));
  const shared = { evidenceDir: root, barrierDir, runId: 'run-123', caseId: 'H7.S4.M3',
    roles: ['A_IOS', 'B_WEB'], timeoutMs: 30 };
  try {
    await assert.rejects(arriveAtBarrier({ ...shared, role: 'B_WEB', actorId: 'actor-a',
      name: 'wrong-actor' }), /actor identity/);
    const first = arriveAtBarrier({ ...shared, role: 'A_IOS', actorId: 'actor-a', name: 'duplicate' });
    const firstTimeout = assert.rejects(first, /timed out/);
    const marker = path.join(barrierDir, 'duplicate--A_IOS.json');
    for (let attempt = 0; attempt < 50; attempt += 1) {
      try {
        await access(marker);
        break;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 1));
      }
    }
    await access(marker);
    await assert.rejects(arriveAtBarrier({ ...shared, role: 'A_IOS', actorId: 'actor-a',
      name: 'duplicate' }), /already arrived/);
    await firstTimeout;
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
