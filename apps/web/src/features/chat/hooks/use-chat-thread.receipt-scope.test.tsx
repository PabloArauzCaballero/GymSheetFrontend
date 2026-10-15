import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import type { ConversationSummary } from '@/shared/api/schemas';
import { queryKeys } from '@/shared/api/query-keys';
import { chatService } from '@/features/chat/services/chat-service';
import {
  conversationId,
  resetThreadMocks,
  socketListeners,
  wrapperFor,
} from './use-chat-thread.test-support';
import { useChatThread } from './use-chat-thread';

vi.mock('socket.io-client', async () =>
  (await import('./use-chat-thread.test-support')).socketIoMock());
vi.mock('@/features/chat/services/chat-service', async () =>
  (await import('./use-chat-thread.test-support')).chatServiceMock());

describe('useChatThread conversation scoping', () => {
  beforeEach(() => resetThreadMocks(chatService));

  it('keeps receipt barriers and live cursors scoped to their conversation when the thread changes', async () => {
    const firstOtherUserId = '33333333-3333-4333-8333-333333333333';
    const secondOtherUserId = '55555555-5555-4555-8555-555555555555';
    const secondConversationId = '66666666-6666-4666-8666-666666666666';
    const summary = (id: string, otherUserId: string, readAt: string | null): ConversationSummary => ({
      conversationId: id,
      otherUserId,
      otherUserName: 'Socio',
      otherUserPhotoUrl: null,
      otherUserOnline: false,
      otherUserLastSeenAt: null,
      lastMessage: null,
      lastMessageAt: null,
      canWrite: true,
      systemKind: null,
      nickname: null,
      otherUserLastDeliveredAt: null,
      otherUserLastReadAt: readAt,
      otherUserReadReceiptsSinceAt: null,
    });
    vi.mocked(chatService.listConversations).mockResolvedValue([
      summary(conversationId, firstOtherUserId, null),
      summary(secondConversationId, secondOtherUserId, null),
    ]);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const { result, rerender } = renderHook(
      ({ id }) => useChatThread({ conversationId: id, socketOrigin: 'http://localhost:3000' }),
      { initialProps: { id: conversationId }, wrapper: wrapperFor(queryClient) },
    );

    await waitFor(() => expect(result.current.conversation?.otherUserId).toBe(firstOtherUserId));
    let resolveFirstConversationRefresh!: (items: ConversationSummary[]) => void;
    vi.mocked(chatService.listConversations).mockImplementationOnce(
      () => new Promise((resolve) => (resolveFirstConversationRefresh = resolve)),
    );
    act(() => {
      socketListeners.get('read-receipts:changed')?.({ conversationId, userId: '44444444-4444-4444-8444-444444444444' });
    });
    await waitFor(() => expect(resolveFirstConversationRefresh).toBeTypeOf('function'));

    rerender({ id: secondConversationId });
    await waitFor(() => expect(result.current.conversation?.otherUserId).toBe(secondOtherUserId));
    act(() => {
      socketListeners.get('message:read')?.({
        conversationId: secondConversationId,
        userId: secondOtherUserId,
        readAt: '2001-01-01T00:00:00.000Z',
        readFrom: null,
      });
    });

    expect(result.current.otherLastReadAt).toBe('2001-01-01T00:00:00.000Z');
    await act(async () =>
      resolveFirstConversationRefresh([
        summary(conversationId, firstOtherUserId, null),
        summary(secondConversationId, secondOtherUserId, null),
      ]),
    );
  });

  it('ignores read, settings, and revocation events from another conversation', async () => {
    const peerId = '33333333-3333-4333-8333-333333333333';
    const otherConversationId = '66666666-6666-4666-8666-666666666666';
    const active: ConversationSummary = {
      conversationId,
      otherUserId: peerId,
      otherUserName: 'Ana',
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
    };
    vi.mocked(chatService.listConversations).mockResolvedValue([active]);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(
      () => useChatThread({ conversationId, socketOrigin: 'http://localhost:3000' }),
      { wrapper: wrapperFor(queryClient) },
    );

    await waitFor(() => expect(result.current.conversation?.conversationId).toBe(conversationId));
    const listCallCount = vi.mocked(chatService.listConversations).mock.calls.length;
    act(() => {
      socketListeners.get('message:delivered')?.({
        conversationId: otherConversationId,
        userId: peerId,
        deliveredAt: '2099-01-01T00:00:00.000Z',
      });
      socketListeners.get('message:read')?.({
        conversationId: otherConversationId,
        userId: peerId,
        readAt: '2099-01-01T00:00:00.000Z',
        readFrom: null,
      });
      socketListeners.get('read-receipts:changed')?.({
        conversationId: otherConversationId,
        userId: peerId,
      });
      socketListeners.get('conversation:revoked')?.({
        conversationId: otherConversationId,
        byUserId: peerId,
      });
    });

    expect(result.current.otherLastReadAt).toBeNull();
    expect(result.current.otherLastDeliveredAt).toBeNull();
    expect(result.current.conversationRevoked).toBe(false);
    expect(chatService.listConversations).toHaveBeenCalledTimes(listCallCount);
    expect(invalidateSpy).not.toHaveBeenCalledWith({ queryKey: queryKeys.conversations });
  });

});
