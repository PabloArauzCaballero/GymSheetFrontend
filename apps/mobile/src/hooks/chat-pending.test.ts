/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import type { ChatMessage } from '@gymsheet/schemas';
import { isPendingMessage, pendingAudioMessage, pendingTextMessage, unconfirmedPending, withoutPending } from './chat-pending.ts';

const me = '00000000-0000-4000-8000-000000000003';
const conversationId = '00000000-0000-4000-8000-000000000002';
const requestA = '00000000-0000-4000-8000-0000000000aa';
const requestB = '00000000-0000-4000-8000-0000000000bb';
const now = new Date('2026-11-09T10:00:00.000Z');

const confirmed = (overrides: Partial<ChatMessage>): ChatMessage => ({
  id: '00000000-0000-4000-8000-000000000010', conversationId, senderId: me, body: 'Hola', type: 'text',
  storyReference: null, mediaUrl: null, mediaMimeType: null, viewOnce: false, viewed: false,
  locationLat: null, locationLng: null, createdAt: now.toISOString(), ...overrides,
});

test('a pending text bubble uses the request id as provisional id', () => {
  const pending = pendingTextMessage({ clientRequestId: requestA, conversationId, senderId: me, body: 'Hola', now });
  assert.equal(pending.id, requestA);
  assert.equal(pending.type, 'text');
  assert.equal(pending.body, 'Hola');
  assert.equal(pending.createdAt, now.toISOString());
});

test('a pending voice note plays from the local file and keeps the view-once choice', () => {
  const pending = pendingAudioMessage({
    clientRequestId: requestA, conversationId, senderId: me, localUri: 'file:///tmp/nota.m4a', viewOnce: true, now,
  });
  assert.equal(pending.type, 'audio');
  assert.equal(pending.mediaUrl, 'file:///tmp/nota.m4a');
  assert.equal(pending.viewOnce, true);
});

test('a pending reply carries the quote, but never the body of a view-once original', () => {
  const original = confirmed({ type: 'audio', body: null, viewOnce: true });
  const pending = pendingTextMessage({ clientRequestId: requestA, conversationId, senderId: me, body: 'ok', replyTo: original, now });
  assert.deepEqual(pending.replyTo, { messageId: original.id, senderId: me, type: 'audio', body: null, available: true });
});

test('pending bubbles disappear once the server copy arrives with the same clientRequestId', () => {
  const pendingA = pendingTextMessage({ clientRequestId: requestA, conversationId, senderId: me, body: 'A', now });
  const pendingB = pendingTextMessage({ clientRequestId: requestB, conversationId, senderId: me, body: 'B', now });
  assert.deepEqual(unconfirmedPending([pendingA, pendingB], []), [pendingA, pendingB]);
  assert.deepEqual(unconfirmedPending([pendingA, pendingB], [confirmed({ clientRequestId: requestA })]), [pendingB]);
  // Un servidor anterior no devuelve clientRequestId: no casa nada por sí solo.
  assert.deepEqual(unconfirmedPending([pendingB], [confirmed({ clientRequestId: null })]), [pendingB]);
  assert.deepEqual(withoutPending([pendingA, pendingB], requestA), [pendingB]);
});

test('only provisional ids count as pending', () => {
  const pendingIds = new Set([requestA]);
  assert.equal(isPendingMessage(confirmed({ id: requestA }), pendingIds), true);
  assert.equal(isPendingMessage(confirmed({}), pendingIds), false);
});
