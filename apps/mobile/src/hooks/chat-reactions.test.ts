/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import type { ChatMessage } from '@gymsheet/schemas';
import {
  QUICK_REACTIONS,
  applyReactions,
  myReaction,
  nextReaction,
  reactionsAccessibilityLabel,
  summarizeReactions,
  withReaction,
} from './chat-reactions.ts';

const me = '00000000-0000-4000-8000-000000000003';
const other = '00000000-0000-4000-8000-000000000004';

test('six quick reactions, like WhatsApp', () => {
  assert.equal(QUICK_REACTIONS.length, 6);
});

test('summary groups by emoji and marks mine', () => {
  const summary = summarizeReactions([{ userId: other, emoji: '❤️' }, { userId: me, emoji: '❤️' }], me);
  assert.deepEqual(summary, [{ emoji: '❤️', count: 2, mine: true }]);
  assert.equal(reactionsAccessibilityLabel(summary), 'Reacciones: ❤️ 2. Tu reacción: ❤️');
  assert.deepEqual(summarizeReactions(undefined, me), []);
});

test('one reaction per person: a new one replaces it, the same one removes it', () => {
  const start = [{ userId: other, emoji: '👍' }, { userId: me, emoji: '😂' }];
  assert.equal(myReaction(start, me), '😂');
  assert.deepEqual(withReaction(start, me, '💪'), [{ userId: other, emoji: '👍' }, { userId: me, emoji: '💪' }]);
  assert.deepEqual(withReaction(start, me, null), [{ userId: other, emoji: '👍' }]);
  assert.equal(nextReaction('😂', '😂'), null);
  assert.equal(nextReaction('😂', '👍'), '👍');
});

test('a reaction event patches only its message', () => {
  const base: ChatMessage = {
    id: '00000000-0000-4000-8000-000000000001', conversationId: '00000000-0000-4000-8000-000000000002',
    senderId: me, body: 'Hola', type: 'text', storyReference: null, mediaUrl: null, mediaMimeType: null,
    viewOnce: false, viewed: false, locationLat: null, locationLng: null, createdAt: '2026-10-18T10:00:00.000Z',
  };
  const list = [base];
  const patched = applyReactions(list, { messageId: base.id, reactions: [{ userId: other, emoji: '🔥' }] });
  assert.deepEqual(patched[0]?.type !== 'system' && patched[0]?.reactions, [{ userId: other, emoji: '🔥' }]);
  assert.equal(applyReactions(list, { messageId: 'nope', reactions: [] }), list);
});
