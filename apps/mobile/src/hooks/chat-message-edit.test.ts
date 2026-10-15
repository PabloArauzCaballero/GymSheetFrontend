/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import type { Message } from '@gymsheet/schemas';
import { applyMessageUpdated, canEditMessage, applyKnownMessageUpdates } from './chat-message-edit.ts';

const message: Message = {
  id: '00000000-0000-4000-8000-000000000001',
  conversationId: '00000000-0000-4000-8000-000000000002',
  senderId: '00000000-0000-4000-8000-000000000003',
  body: 'original',
  type: 'text',
  storyReference: null,
  mediaUrl: null,
  mediaMimeType: null,
  viewOnce: false,
  viewed: false,
  locationLat: null,
  locationLng: null,
  createdAt: '2026-10-09T10:00:00.000Z',
  editedAt: null,
  deletedAt: null,
};

test('allows only own undeleted text messages within the backend edit window', () => {
  const now = new Date('2026-10-09T10:15:00.000Z');
  assert.equal(canEditMessage(message, message.senderId, now), true);
  assert.equal(canEditMessage(message, '00000000-0000-4000-8000-000000000004', now), false);
  assert.equal(canEditMessage({ ...message, type: 'audio' }, message.senderId, now), false);
  assert.equal(canEditMessage({ ...message, deletedAt: '2026-10-09T10:01:00.000Z' }, message.senderId, now), false);
  assert.equal(canEditMessage(message, message.senderId, new Date('2026-10-09T10:15:00.001Z')), false);
});

test('keeps training system events outside edit and update actions', () => {
  const event: Message = {
    id: '00000000-0000-4000-8000-000000000005',
    conversationId: message.conversationId,
    senderId: null,
    type: 'system',
    systemEvent: {
      kind: 'TRAINING_INVITE_ACCEPTED',
      invitationId: '00000000-0000-4000-8000-000000000006',
      acceptedRevision: 2,
      startsAt: '2026-10-11T15:00:00.000Z',
      timeZone: 'America/La_Paz',
      placeLabel: 'Gimnasio Central',
    },
    createdAt: '2026-10-09T10:00:00.000Z',
  };
  assert.equal(canEditMessage(event, message.senderId, new Date('2026-10-09T10:01:00.000Z')), false);
  assert.deepEqual(applyMessageUpdated([event], message, event.conversationId), [event]);
});

test('applies an update only to an existing message in the active conversation', () => {
  const updated = { ...message, body: 'updated', editedAt: '2026-10-09T10:01:00.000Z' };
  assert.deepEqual(applyMessageUpdated([message], updated, message.conversationId), [updated]);
  assert.deepEqual(applyMessageUpdated([message], { ...updated, conversationId: '00000000-0000-4000-8000-000000000004' }, message.conversationId), [message]);
  assert.deepEqual(applyMessageUpdated([], updated, message.conversationId), []);
});

test('does not replace a local tombstone when a delayed update arrives', () => {
  const tombstone = { ...message, body: 'Mensaje eliminado', deletedAt: '2026-10-09T10:02:00.000Z' };
  const updated = { ...message, body: 'late edit', editedAt: '2026-10-09T10:01:00.000Z' };
  assert.deepEqual(applyMessageUpdated([tombstone], updated, message.conversationId, new Set([message.id])), [tombstone]);
});

test('applies remembered edits to a page that arrived after its socket event', () => {
  const oldPageMessage = { ...message, body: 'original from delayed page' };
  const updated = { ...message, body: 'new text', editedAt: '2026-10-09T10:01:00.000Z' };
  assert.deepEqual(
    applyKnownMessageUpdates([oldPageMessage], new Map([[message.id, updated]]), message.conversationId),
    [updated],
  );
});
