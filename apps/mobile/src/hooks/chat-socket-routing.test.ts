/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import { isForActiveConversation } from './chat-socket-routing.ts';

test('drops delayed receipts and revocation for A while conversation B is active', () => {
  const delayedReadA = { conversationId: 'conversation-a', userId: 'peer-a', readAt: '2026-10-09T10:00:00Z' };
  const delayedRevocationA = { conversationId: 'conversation-a', byUserId: 'peer-a' };
  const delayedMessageA = { conversationId: 'conversation-a', id: 'message-a' };
  assert.equal(isForActiveConversation(delayedReadA, 'conversation-b'), false);
  assert.equal(isForActiveConversation(delayedRevocationA, 'conversation-b'), false);
  assert.equal(isForActiveConversation(delayedMessageA, 'conversation-b'), false);
  assert.equal(isForActiveConversation({ conversationId: 'conversation-b' }, 'conversation-b'), true);
});

test('drops events if the socket has no active conversation', () => {
  assert.equal(isForActiveConversation({ conversationId: 'conversation-a' }, null), false);
});
