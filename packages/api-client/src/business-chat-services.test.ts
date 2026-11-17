import { describe, expect, it } from 'vitest';
import { conversationSummarySchema } from '@gymsheet/schemas';
import { createApiClient } from './client';
import { createBusinessChatServices } from './business-chat-services';

const CONVERSATION = '8b1f6a52-3d5e-4d0b-9a63-0c8b4a5f1d11';
const ENTITY = '4e0b2a6c-1f3d-4b8a-9c2e-7d6f5a4b3c21';

function recordingClient(status: number, data: unknown) {
  const calls: Array<{ url: string; method: string; body: unknown }> = [];
  const fetchImpl = (async (url: string, init: RequestInit) => {
    calls.push({ url: url.replace('https://api.test', ''), method: init.method ?? 'GET', body: typeof init.body === 'string' ? JSON.parse(init.body) : undefined });
    return new Response(JSON.stringify(status < 300 ? { ok: true, data } : data), { status });
  }) as typeof fetch;
  return { calls, services: createBusinessChatServices(createApiClient({ baseUrl: 'https://api.test', fetchImpl }).request) };
}

describe('business chat services', () => {
  it('opens the chat with a listing and returns its conversation', async () => {
    const { calls, services } = recordingClient(201, { conversationId: CONVERSATION });
    await expect(services.open(ENTITY)).resolves.toEqual({ conversationId: CONVERSATION });
    expect(calls).toEqual([{ url: '/me/business-conversations', method: 'POST', body: { entityId: ENTITY } }]);
  });

  it('keeps the domain code of a refusal', async () => {
    const { services } = recordingClient(429, { ok: false, code: 'BUSINESS_CHAT_LIMIT', detail: 'Límite.' });
    await expect(services.open(ENTITY)).rejects.toMatchObject({ status: 429, code: 'BUSINESS_CHAT_LIMIT' });
  });

  it('blocks a person from a business conversation', async () => {
    const { calls, services } = recordingClient(200, { conversationId: CONVERSATION, blocked: true });
    await expect(services.block(CONVERSATION)).resolves.toEqual({ conversationId: CONVERSATION, blocked: true });
    expect(calls[0]).toMatchObject({ url: `/business/me/conversations/${CONVERSATION}/block`, method: 'POST' });
  });
});

describe('conversation summary kind', () => {
  const base = {
    conversationId: CONVERSATION,
    otherUserId: ENTITY,
    otherUserName: 'Gym Centro',
    otherUserPhotoUrl: null,
    otherUserOnline: false,
    otherUserLastSeenAt: null,
    lastMessage: null,
    lastMessageAt: null,
    canWrite: true,
    systemKind: null,
    nickname: null,
    otherUserLastDeliveredAt: null,
    otherUserLastReadAt: null,
    otherUserReadReceiptsSinceAt: null,
    disappearingSeconds: null,
  };

  it('parses a business conversation and an item from a server before franja 8f', () => {
    expect(conversationSummarySchema.parse({ ...base, kind: 'BUSINESS', businessEntityId: ENTITY })).toMatchObject({ kind: 'BUSINESS', businessEntityId: ENTITY });
    expect(conversationSummarySchema.parse(base).kind).toBeUndefined();
    expect(conversationSummarySchema.safeParse({ ...base, kind: 'GROUP' }).success).toBe(false);
  });
});
