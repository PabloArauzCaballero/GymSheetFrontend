/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import type { Message } from '@gymsheet/schemas';
import {
  canDeleteForEveryone,
  isTombstone,
  messageActions,
  tombstoneLabel,
} from './chat-message-actions.ts';

const me = '00000000-0000-4000-8000-000000000003';
const other = '00000000-0000-4000-8000-000000000004';
const message: Message = {
  id: '00000000-0000-4000-8000-000000000001',
  conversationId: '00000000-0000-4000-8000-000000000002',
  senderId: me,
  body: 'Hola bro',
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
const at = (iso: string) => new Date(iso);

test('own text within 15 minutes: copy, edit and delete — never report', () => {
  assert.deepEqual(
    messageActions(message, me, { canWrite: true, tombstone: false, now: at('2026-10-09T10:14:00.000Z') }),
    ['copy', 'edit', 'delete'],
  );
});

test('edit disappears after 15 minutes and in read-only chats, like WhatsApp', () => {
  assert.deepEqual(
    messageActions(message, me, { canWrite: true, tombstone: false, now: at('2026-10-09T10:16:00.000Z') }),
    ['copy', 'delete'],
  );
  assert.deepEqual(
    messageActions(message, me, { canWrite: false, tombstone: false, now: at('2026-10-09T10:01:00.000Z') }),
    ['copy', 'delete'],
  );
});

test('media is never copied nor edited; the other person can report it', () => {
  const photo: Message = { ...message, senderId: other, type: 'image', body: null, mediaUrl: '/m/1' };
  assert.deepEqual(
    messageActions(photo, me, { canWrite: true, tombstone: false, now: at('2026-10-09T10:01:00.000Z') }),
    ['delete', 'report'],
  );
});

test('a deleted message can only be removed from my own view', () => {
  assert.deepEqual(messageActions(message, me, { canWrite: true, tombstone: true }), ['delete']);
  assert.equal(isTombstone({ ...message, deletedAt: '2026-10-09T10:01:00.000Z' }, new Set()), true);
  assert.equal(isTombstone(message, new Set([message.id])), true);
  assert.equal(isTombstone(message, new Set()), false);
});

test('delete for everyone lasts 60 hours and only for the sender', () => {
  assert.equal(canDeleteForEveryone(message, me, at('2026-10-11T22:00:00.000Z')), true);
  assert.equal(canDeleteForEveryone(message, me, at('2026-10-11T22:00:00.001Z')), false);
  assert.equal(canDeleteForEveryone(message, other, at('2026-10-09T10:01:00.000Z')), false);
  assert.equal(canDeleteForEveryone({ ...message, deletedAt: '2026-10-09T10:01:00.000Z' }, me, at('2026-10-09T10:02:00.000Z')), false);
});

test('tombstone wording follows WhatsApp', () => {
  assert.equal(tombstoneLabel(true), 'Eliminaste este mensaje');
  assert.equal(tombstoneLabel(false), 'Se eliminó este mensaje');
});
