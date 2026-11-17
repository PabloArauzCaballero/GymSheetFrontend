/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import { conversationPreview, EMPTY_CONVERSATION_PREVIEW, UNKNOWN_MESSAGE_PREVIEW } from './conversation-preview.ts';

const at = '2026-11-13T15:59:00.000Z';

test('an empty conversation keeps the empty-state copy', () => {
  assert.deepEqual(conversationPreview({ lastMessage: null, lastMessageAt: null }), {
    icon: null, prefix: null, text: EMPTY_CONVERSATION_PREVIEW, subdued: true,
  });
});

test('a message without text is never shown as an empty conversation', () => {
  const preview = conversationPreview({ lastMessage: null, lastMessageAt: at });
  assert.equal(preview.text, UNKNOWN_MESSAGE_PREVIEW);
  assert.notEqual(preview.text, EMPTY_CONVERSATION_PREVIEW);
});

test('a voice note I sent shows the mic and the «Tú:» prefix', () => {
  assert.deepEqual(
    conversationPreview({ lastMessage: 'Nota de voz', lastMessageType: 'audio', lastMessageFromMe: true, lastMessageAt: at }),
    { icon: 'mic', prefix: 'Tú: ', text: 'Nota de voz', subdued: false },
  );
});

test('a text from the other person has no icon and no prefix', () => {
  assert.deepEqual(
    conversationPreview({ lastMessage: 'Hola', lastMessageType: 'text', lastMessageFromMe: false, lastMessageAt: at }),
    { icon: null, prefix: null, text: 'Hola', subdued: false },
  );
});

test('system and deleted rows are subdued and never prefixed', () => {
  for (const type of ['system', 'deleted']) {
    const preview = conversationPreview({ lastMessage: 'x', lastMessageType: type, lastMessageFromMe: true, lastMessageAt: at });
    assert.equal(preview.prefix, null);
    assert.equal(preview.subdued, true);
  }
});

test('an unknown server type falls back to plain text', () => {
  assert.equal(conversationPreview({ lastMessage: 'x', lastMessageType: 'poll', lastMessageAt: at }).icon, null);
});

test('an empty system chat says what it is instead of «sin mensajes»', () => {
  assert.equal(conversationPreview({ lastMessage: null, lastMessageAt: null, systemKind: 'CORPORATE' }).text, 'Novedades y avisos de GymSheet.');
});

test('an unknown system kind keeps the generic empty copy', () => {
  assert.equal(conversationPreview({ lastMessage: null, lastMessageAt: null, systemKind: 'OTHER' }).text, EMPTY_CONVERSATION_PREVIEW);
});
