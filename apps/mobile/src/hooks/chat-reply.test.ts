/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import type { ChatMessage } from '@gymsheet/schemas';
import { messagePreviewText, replyAuthorLabel, replyGlyph, replyPreviewText } from './chat-reply.ts';

const me = '00000000-0000-4000-8000-000000000003';
const base: ChatMessage = {
  id: '00000000-0000-4000-8000-000000000001', conversationId: '00000000-0000-4000-8000-000000000002',
  senderId: me, body: 'Hola', type: 'text', storyReference: null, mediaUrl: null, mediaMimeType: null,
  viewOnce: false, viewed: false, locationLat: null, locationLng: null, createdAt: '2026-10-18T10:00:00.000Z',
};

test('one-line preview per message type', () => {
  assert.equal(messagePreviewText(base), 'Hola');
  assert.equal(messagePreviewText({ ...base, type: 'image', body: null }), 'Foto');
  assert.equal(messagePreviewText({ ...base, type: 'image', body: 'Mi PR' }), 'Mi PR');
  assert.equal(messagePreviewText({ ...base, type: 'video', body: 'secreto', viewOnce: true }), 'Video de vista única');
  assert.equal(messagePreviewText({ ...base, type: 'audio', body: null }), 'Nota de voz');
  assert.equal(messagePreviewText({ ...base, type: 'location', body: null, locationLabel: 'Gimnasio X' }), 'Gimnasio X');
});

test('quote text comes from the server snapshot; an unavailable original says so', () => {
  const reply = { messageId: base.id, senderId: me, type: 'text', body: 'Vamos', available: true };
  assert.equal(replyPreviewText(reply), 'Vamos');
  assert.equal(replyPreviewText({ ...reply, type: 'audio', body: null }), 'Nota de voz');
  assert.equal(replyPreviewText({ ...reply, available: false }), 'Este mensaje ya no está disponible');
  assert.equal(replyGlyph('image'), 'image');
  assert.equal(replyGlyph('text'), null);
});

test('the quote author is «Tú» for my own messages', () => {
  assert.equal(replyAuthorLabel(me, me, 'Ana'), 'Tú');
  assert.equal(replyAuthorLabel('x', me, 'Ana'), 'Ana');
});
