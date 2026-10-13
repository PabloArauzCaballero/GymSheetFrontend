/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import type { Message } from '@gymsheet/schemas';
import {
  applyMessageDeleted,
  mergeIncomingMessage,
  sanitizeDeletedMessages,
  type MessageDeletedEvent,
} from './chat-message-deletion.ts';

const original: Message = {
  id: '00000000-0000-4000-8000-000000000001',
  conversationId: '00000000-0000-4000-8000-000000000002',
  senderId: '00000000-0000-4000-8000-000000000003',
  body: 'caption confidencial',
  type: 'image',
  storyReference: null,
  mediaUrl: '/private/image.jpg',
  mediaMimeType: 'image/jpeg',
  viewOnce: true,
  viewed: true,
  locationLat: null,
  locationLng: null,
  createdAt: '2026-10-09T10:00:00.000Z',
};

const deleted: MessageDeletedEvent = {
  conversationId: original.conversationId,
  messageId: original.id,
  scope: 'EVERYONE',
  deletedAt: '2026-10-09T10:01:00.000Z',
};

test('replaces the known message with a sanitized tombstone and ignores delayed message:new', () => {
  const result = applyMessageDeleted([original], deleted);
  assert.deepEqual(result, [{
    ...original,
    body: 'Mensaje eliminado',
    type: 'text',
    mediaUrl: null,
    mediaMimeType: null,
    viewOnce: false,
    viewed: false,
    locationLat: null,
    locationLng: null,
  }]);

  const staleIncoming = mergeIncomingMessage(result, original, new Set([deleted.messageId]));
  assert.deepEqual(staleIncoming, result);
});

test('sanitizes delayed history pages for ids already deleted by socket event', () => {
  assert.deepEqual(sanitizeDeletedMessages([original], new Set([deleted.messageId])), [{
    ...original,
    body: 'Mensaje eliminado',
    type: 'text',
    mediaUrl: null,
    mediaMimeType: null,
    viewOnce: false,
    viewed: false,
    locationLat: null,
    locationLng: null,
  }]);
});

test('does not apply a deletion event from another conversation', () => {
  assert.deepEqual(applyMessageDeleted([original], { ...deleted, conversationId: '00000000-0000-4000-8000-000000000004' }), [original]);
});

test('keeps system events unchanged when a deletion event or stale deleted id targets them', () => {
  const event: Message = {
    id: '00000000-0000-4000-8000-000000000005',
    conversationId: original.conversationId,
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
  const targetedDelete = { ...deleted, messageId: event.id };
  assert.deepEqual(applyMessageDeleted([event], targetedDelete), [event]);
  assert.deepEqual(sanitizeDeletedMessages([event], new Set([event.id])), [event]);
});
