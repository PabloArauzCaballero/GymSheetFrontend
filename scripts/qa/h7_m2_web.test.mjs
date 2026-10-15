import assert from 'node:assert/strict';
import test from 'node:test';
import { validateAudioFixture, assertDurationMatch, downloadAudio, validateSenderMarker, assertDeletedFixture, buildAudioEvidence, apiData, confirmDownloadedAudio, buildCleanupEvidence, prepareEmptyWebChat } from './h7_m2_web.mjs';
const cid = '11111111-1111-4111-8111-111111111111';
const mid = '22222222-2222-4222-8222-222222222222';
const message = { id: mid, conversationId: cid, senderId: 'actor-a', type: 'audio', mediaMimeType: 'audio/mp4', viewOnce: false, mediaUrl: `/me/conversations/${cid}/messages/${mid}/media` };
test('only the unique pair-owned audio can satisfy the empty-history fixture', () => {
  assert.equal(validateAudioFixture([message], cid, 'actor-a').id, mid);
  for (const messages of [[], [message, message], [{ ...message, senderId: 'actor-b' }], [{ ...message, conversationId: mid }], [{ ...message, viewOnce: true }], [{ ...message, type: 'text' }], [{ ...message, mediaMimeType: 'audio/wav' }], [{ ...message, mediaUrl: 'https://untrusted.test/audio' }]]) assert.throws(() => validateAudioFixture(messages, cid, 'actor-a'));
});
test('duration comparison rejects invalid or mismatched metadata', () => {
  assert.equal(assertDurationMatch(2.1, 2), true);
  for (const duration of [0, NaN, Infinity, 3]) assert.throws(() => assertDurationMatch(duration, 2));
  assert.throws(() => assertDurationMatch(2, NaN));
});
test('audio bytes use authenticated private endpoint without redirects', async () => {
  let request;
  const bytes = await downloadAudio('https://api.test/api/v1', 'private-token', message.mediaUrl, 1000, async (url, options) => {
    request = { url, options };
    return new Response(new Uint8Array([1, 2, 3]), { status: 200 });
  });
  assert.deepEqual([...bytes], [1, 2, 3]);
  assert.equal(request.options.headers.Authorization, 'Bearer private-token');
  assert.equal(request.options.redirect, 'error');
  assert.equal(request.url, `https://api.test/api/v1${message.mediaUrl}`);
  await assert.rejects(downloadAudio('https://api.test', 'secret', 'https://elsewhere.test', 1000));
});
test('sender signal rejects stale invocation, role and actor', () => {
  const metadata = { runId: 'run', case: 'H7.S4.M2', invocationId: 'a'.repeat(32), expectedActorIds: { A_ANDROID: 'actor-a' } };
  const marker = { runId: 'run', case: 'H7.S4.M2', invocationId: 'a'.repeat(32), role: 'A_ANDROID', actorId: 'actor-a', name: 'audio-sent' };
  assert.equal(validateSenderMarker(marker, metadata), true);
  for (const patch of [{ invocationId: 'b'.repeat(32) }, { role: 'B_WEB' }, { actorId: 'other' }]) assert.throws(() => validateSenderMarker({ ...marker, ...patch }, metadata));
});

test('cleanup requires exact owned tombstone and revoked media reference', () => {
  const deleted = { ...message, deletedAt: '2026-10-09T10:00:00Z', mediaUrl: null };
  assert.equal(assertDeletedFixture([deleted], mid, cid, 'actor-a'), true);
  for (const messages of [[], [message], [{ ...deleted, id: cid }], [{ ...deleted, senderId: 'other' }], [{ ...deleted, mediaUrl: message.mediaUrl }], [deleted, deleted]]) assert.throws(() => assertDeletedFixture(messages, mid, cid, 'actor-a'));
});

test('runner audioEvidence uses byte-derived rounded milliseconds and playback proof', () => {
  assert.deepEqual(buildAudioEvidence(message, 'a'.repeat(64), 2.1236, 2.12, 0.6), {
    conversationId: cid, messageId: mid, mediaSha256: 'a'.repeat(64),
    mediaDurationMs: 2124, playerDurationSeconds: 2, playbackAdvanced: true,
  });
  assert.throws(() => buildAudioEvidence(message, 'a'.repeat(64), 2, 2, 0.49));
});

test('M2 envelope API requests reject redirects before bearer is forwarded', async () => {
  let request;
  const data = await apiData('https://api.test/api/v1', 'secret', '/auth/me', {}, async (_url, options) => {
    request = options;
    return new Response(JSON.stringify({ ok: true, data: { id: 'actor-b' } }), { status: 200 });
  });
  assert.equal(data.id, 'actor-b');
  assert.equal(request.redirect, 'error');
  assert.equal(request.headers.Authorization, 'Bearer secret');
});

test('downloaded audio is hashed before B_WEB joins the shared audio-sent barrier', async () => {
  let reached;
  const options = { case: 'H7.S4.M2', role: 'B_WEB', runId: 'run', evidenceDir: '/evidence', barrierDir: '/evidence/barrier' };
  const digest = await confirmDownloadedAudio(Buffer.from([1, 2, 3]), options, 'actor-b', Date.now() + 1000, async (arrival) => { reached = arrival; });
  assert.match(digest, /^[a-f0-9]{64}$/);
  assert.equal(reached.name, 'audio-sent');
  assert.equal(reached.actorId, 'actor-b');
  assert.deepEqual(reached.roles, ['A_ANDROID', 'B_IOS', 'B_WEB']);
  assert.equal(reached.role, 'B_WEB');
  reached = null;
  await assert.rejects(confirmDownloadedAudio(Buffer.alloc(0), options, 'actor-b', Date.now() + 1000, async () => { reached = true; }));
  assert.equal(reached, null);
});
test('cleanup evidence explicitly avoids asserting physical blob deletion', () => {
  assert.deepEqual(buildCleanupEvidence(mid), { messageId: mid, tombstoneConfirmed: true, mediaEndpointUnavailable: true, physicalBlobDeletion: 'not_verified' });
  assert.throws(() => buildCleanupEvidence('wrong-id'));
});

test('browser preflight authenticates and confirms the exact empty chat before returning', async () => {
  const events = [];
  const empty = { waitFor: async () => events.push('empty-visible') };
  const log = { waitFor: async () => events.push('log-visible'), getByText: (text, options) => { assert.equal(text, 'Aún no hay mensajes. Escribe el primero y empieza la conversación.'); assert.equal(options.exact, true); return empty; }, locator: () => ({ count: async () => 0 }) };
  const input = { waitFor: async () => events.push('composer-visible'), isEnabled: async () => true };
  const page = { goto: async (url) => events.push(url), url: () => `https://web.test/chat/${cid}`, getByRole: (role) => role === 'log' ? log : input };
  const browser = { newContext: async () => ({ addCookies: async (cookies) => { assert.equal(cookies[0].name, 'gymsheet_session'); assert.equal(cookies[0].httpOnly, true); events.push('cookie'); }, newPage: async () => page }) };
  assert.equal(await prepareEmptyWebChat(browser, 'https://web.test', 'secret', cid, Date.now() + 1000), page);
  assert.deepEqual(events, ['cookie', `https://web.test/chat/${cid}`, 'log-visible', 'empty-visible', 'composer-visible']);
  page.url = () => 'https://web.test/login';
  await assert.rejects(prepareEmptyWebChat(browser, 'https://web.test', 'secret', cid, Date.now() + 1000), /reserved chat/);
});
