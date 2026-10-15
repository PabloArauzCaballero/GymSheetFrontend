import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConversationSummary, Message } from '@/shared/api/schemas';
import { ApiError } from '@/shared/api/api-error';
import { queryKeys } from '@/shared/api/query-keys';
import { chatService } from '@/features/chat/services/chat-service';
import { ThreadHeader } from '@/features/chat/components/thread-header';
import { useChatThread } from './use-chat-thread';

const socketListeners = new Map<string, (payload: unknown) => void>();
const socketEmits: Array<{ event: string; payload: unknown }> = [];
const deferredJoinAcks: Array<(result: { joined: boolean }) => void> = [];
let deferNextJoinAck = false;

vi.mock('socket.io-client', () => ({
  io: () => ({
    on: (event: string, handler: (payload: unknown) => void) => {
      socketListeners.set(event, handler);
    },
    emit: (event: string, payload: unknown, ack?: (result: { joined: boolean }) => void) => {
      socketEmits.push({ event, payload });
      if (event === 'conversation:join') {
        if (deferNextJoinAck && ack) {
          deferNextJoinAck = false;
          deferredJoinAcks.push(ack);
        } else {
          ack?.({ joined: true });
        }
      }
      if (event === 'message:send') ack?.({ joined: true });
    },
    disconnect: vi.fn(),
  }),
}));

vi.mock('@/features/chat/services/chat-service', () => ({
  chatService: {
    issueSocketTicket: vi.fn().mockResolvedValue({ ticket: 'ticket' }),
    listMessages: vi.fn(),
    listConversations: vi.fn(),
    getReadReceiptSettings: vi.fn(),
    updateReadReceiptSettings: vi.fn(),
    editMessage: vi.fn(),
    markRead: vi.fn().mockResolvedValue({ read: true }),
    viewMessage: vi.fn(),
  },
}));

const conversationId = '11111111-1111-4111-8111-111111111111';
const messageId = '22222222-2222-4222-8222-222222222222';

const privateViewOnceMessage: Message = {
  id: messageId,
  conversationId,
  senderId: '33333333-3333-4333-8333-333333333333',
  body: 'captiono privado',
  type: 'image',
  storyReference: null,
  mediaUrl: 'https://media.example/private.jpg',
  mediaMimeType: 'image/jpeg',
  viewOnce: true,
  viewed: true,
  locationLat: null,
  locationLng: null,
  createdAt: '2026-10-09T10:00:00.000Z',
};

function wrapperFor(queryClient: QueryClient) {
  function QueryWrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return QueryWrapper;
}

describe('useChatThread live event reconciliation', () => {
  beforeEach(() => {
    socketListeners.clear();
    socketEmits.length = 0;
    deferredJoinAcks.length = 0;
    deferNextJoinAck = false;
    vi.mocked(chatService.listMessages).mockResolvedValue([privateViewOnceMessage]);
    vi.mocked(chatService.listConversations).mockResolvedValue([]);
    vi.mocked(chatService.viewMessage).mockResolvedValue(privateViewOnceMessage);
  });

  it('sanitizes the active thread immediately and keeps a stale message or history from restoring content', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    queryClient.setQueryData(queryKeys.messages(conversationId), [privateViewOnceMessage]);
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(
      () => useChatThread({ conversationId, socketOrigin: 'http://localhost:3000' }),
      { wrapper: wrapperFor(queryClient) },
    );

    await waitFor(() => expect(result.current.messages).toHaveLength(1));
    act(() => {
      result.current.revealViewOnce.mutate(messageId);
    });
    await waitFor(() => expect(result.current.revealedMedia[messageId]).toBe(privateViewOnceMessage.mediaUrl));

    const deleted = socketListeners.get('message:deleted');
    expect(deleted).toBeTypeOf('function');
    act(() => {
      deleted?.({ conversationId, messageId, scope: 'EVERYONE', deletedAt: '2026-10-09T10:01:00.000Z' });
    });

    await waitFor(() => {
      const message = result.current.messages[0];
      expect(message?.body).toBe('Mensaje eliminado');
      expect(message?.type).toBe('text');
      expect(message?.mediaUrl).toBeNull();
      expect(message?.mediaMimeType).toBeNull();
      expect(message?.viewOnce).toBe(false);
      expect(result.current.revealedMedia[messageId]).toBeUndefined();
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.messages(conversationId) });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.conversations });

    act(() => {
      socketListeners.get('message:new')?.(privateViewOnceMessage);
      queryClient.setQueryData(queryKeys.messages(conversationId), [privateViewOnceMessage]);
    });

    await waitFor(() => {
      expect(result.current.messages[0]?.body).toBe('Mensaje eliminado');
      expect(result.current.messages[0]?.mediaUrl).toBeNull();
      expect(result.current.revealedMedia[messageId]).toBeUndefined();
    });

    let resolveLateView!: (message: Message) => void;
    vi.mocked(chatService.viewMessage).mockImplementationOnce(
      () => new Promise((resolve) => (resolveLateView = resolve)),
    );
    act(() => result.current.revealViewOnce.mutate(messageId));
    await waitFor(() => expect(resolveLateView).toBeTypeOf('function'));
    await act(async () => resolveLateView(privateViewOnceMessage));
    expect(result.current.revealedMedia[messageId]).toBeUndefined();
  });

  it('does not let a deferred old history response overwrite a completed edit', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } },
    });
    const editableMessage: Message = {
      ...privateViewOnceMessage,
      senderId: '44444444-4444-4444-8444-444444444444',
      body: 'original text',
      type: 'text',
      mediaUrl: null,
      mediaMimeType: null,
      viewOnce: false,
      viewed: false,
    };
    const updatedMessage: Message = {
      ...editableMessage,
      body: 'edited text',
      editedAt: '2026-10-09T10:01:00.000Z',
    };
    queryClient.setQueryData(queryKeys.messages(conversationId), [editableMessage]);
    let resolveOldHistory!: (messages: Message[]) => void;
    vi.mocked(chatService.listMessages).mockImplementationOnce(
      () => new Promise((resolve) => { resolveOldHistory = resolve; }),
    );
    vi.mocked(chatService.editMessage).mockResolvedValue(updatedMessage);

    const { result } = renderHook(
      () => useChatThread({ conversationId, socketOrigin: 'http://localhost:3000' }),
      { wrapper: wrapperFor(queryClient) },
    );

    act(() => { void queryClient.invalidateQueries({ queryKey: queryKeys.messages(conversationId) }); });
    await waitFor(() => expect(resolveOldHistory).toBeTypeOf('function'));
    act(() => result.current.editMessage.mutate({ messageId, body: 'edited text' }));
    await waitFor(() => expect(result.current.messages[0]?.body).toBe('edited text'));

    await act(async () => { resolveOldHistory([editableMessage]); });

    expect(queryClient.getQueryData<Message[]>(queryKeys.messages(conversationId))?.[0]?.body).toBe('edited text');
    expect(result.current.messages[0]?.body).toBe('edited text');
  });

  it('clears cached history and revealed media when a visible-thread refetch returns 404 without a revoked event', async () => {
    const visibilityDescriptor = Object.getOwnPropertyDescriptor(document, 'visibilityState');
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } },
    });
    queryClient.setQueryData(queryKeys.messages(conversationId), [privateViewOnceMessage]);
    vi.mocked(chatService.listMessages).mockClear();
    let rejectResumeFetch!: (error: ApiError) => void;
    vi.mocked(chatService.listMessages).mockImplementationOnce(
      () => new Promise((_, reject) => (rejectResumeFetch = reject)),
    );
    const { result, unmount } = renderHook(
      () => useChatThread({ conversationId, socketOrigin: 'http://localhost:3000' }),
      { wrapper: wrapperFor(queryClient) },
    );

    try {
      await waitFor(() => expect(result.current.messages).toHaveLength(1));
      act(() => result.current.revealViewOnce.mutate(messageId));
      await waitFor(() => expect(result.current.revealedMedia[messageId]).toBe(privateViewOnceMessage.mediaUrl));

      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
      act(() => document.dispatchEvent(new Event('visibilitychange')));

      await waitFor(() => expect(chatService.listMessages).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(rejectResumeFetch).toBeTypeOf('function'));
      expect(result.current.isValidatingHistory).toBe(true);
      expect(result.current.messages).toEqual([]);
      expect(result.current.revealedMedia).toEqual({});

      await act(async () =>
        rejectResumeFetch(new ApiError({ message: 'Not found', status: 404, kind: 'not-found' })),
      );
      await waitFor(() => expect(result.current.conversationUnavailable).toBe(true));
      expect(result.current.messages).toEqual([]);
      expect(result.current.revealedMedia).toEqual({});
      expect(queryClient.getQueryData(queryKeys.messages(conversationId))).toEqual([]);
      expect(socketListeners.get('conversation:revoked')).toBeTypeOf('function');
    } finally {
      unmount();
      if (visibilityDescriptor) {
        Object.defineProperty(document, 'visibilityState', visibilityDescriptor);
      } else {
        Reflect.deleteProperty(document, 'visibilityState');
      }
    }
  });

  it('refreshes receipt settings on a remote change so the next update uses its new version', async () => {
    const peerId = '33333333-3333-4333-8333-333333333333';
    const conversation: ConversationSummary = {
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
    vi.mocked(chatService.listConversations).mockResolvedValue([conversation]);
    let settingsFetchCount = 0;
    vi.mocked(chatService.getReadReceiptSettings).mockImplementation(async () => {
      settingsFetchCount += 1;
      return {
        enabled: true,
        defaultEnabled: true,
        conversationOverride: false,
        version: settingsFetchCount === 1 ? 7 : 8,
      };
    });
    vi.mocked(chatService.updateReadReceiptSettings).mockResolvedValue({
      enabled: false,
      defaultEnabled: true,
      conversationOverride: false,
      version: 9,
    });

    function ReceiptSettingsIntegration() {
      useChatThread({ conversationId, socketOrigin: 'http://localhost:3000' });
      return (
        <ThreadHeader
          connectionState="connected"
          conversation={conversation}
          onSaveNickname={vi.fn()}
          otherLastSeenAt={null}
          otherOnline={false}
          savingNickname={false}
        />
      );
    }
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    render(<ReceiptSettingsIntegration />, { wrapper: wrapperFor(queryClient) });

    await waitFor(() => expect(chatService.getReadReceiptSettings).toHaveBeenCalledTimes(1));
    act(() => {
      socketListeners.get('read-receipts:changed')?.({
        conversationId,
        userId: '44444444-4444-4444-8444-444444444444',
      });
    });
    await waitFor(() => expect(chatService.getReadReceiptSettings).toHaveBeenCalledTimes(2));

    fireEvent.click(screen.getByLabelText('Más opciones de conversación'));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Desactivar solo en este chat' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Desactivar solo en este chat' }));

    await waitFor(() =>
      expect(vi.mocked(chatService.updateReadReceiptSettings).mock.calls[0]?.[0]).toMatchObject({
        scope: 'CONVERSATION',
        conversationId,
        enabled: false,
        expectedVersion: 8,
      }),
    );
  });

  it('clears the reciprocal read cursor when this account changes its read-receipt setting', async () => {
    const otherUserId = '33333333-3333-4333-8333-333333333333';
    const currentUserId = '44444444-4444-4444-8444-444444444444';
    const conversation: ConversationSummary = {
      conversationId,
      otherUserId,
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
      otherUserLastReadAt: '2026-10-09T10:02:00.000Z',
      otherUserReadReceiptsSinceAt: '2026-10-09T10:00:00.000Z',
    };
    vi.mocked(chatService.listConversations).mockResolvedValue([conversation]);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    let resolveFreshConversations!: (items: ConversationSummary[]) => void;
    const { result } = renderHook(
      () => useChatThread({ conversationId, socketOrigin: 'http://localhost:3000' }),
      { wrapper: wrapperFor(queryClient) },
    );

    await waitFor(() => expect(result.current.conversation?.otherUserId).toBe(otherUserId));
    act(() => {
      socketListeners.get('message:read')?.({
        conversationId,
        userId: otherUserId,
        readAt: '2026-10-09T10:02:00.000Z',
        readFrom: null,
      });
    });
    await waitFor(() => expect(result.current.otherLastReadAt).toBe('2026-10-09T10:02:00.000Z'));
    vi.mocked(chatService.listConversations).mockImplementationOnce(
      () => new Promise((resolve) => (resolveFreshConversations = resolve)),
    );

    act(() => {
      socketListeners.get('read-receipts:changed')?.({ conversationId, userId: currentUserId });
    });

    await waitFor(() => expect(result.current.otherLastReadAt).toBeNull());
    await waitFor(() => expect(resolveFreshConversations).toBeTypeOf('function'));
    queryClient.setQueryData(queryKeys.conversations, [
      { ...conversation, otherUserLastReadAt: null, otherUserReadReceiptsSinceAt: null },
    ]);
    act(() => {
      socketListeners.get('message:read')?.({
        conversationId,
        userId: otherUserId,
        readAt: '2001-01-01T00:00:00.000Z',
        readFrom: null,
      });
    });
    expect(result.current.otherLastReadAt).toBeNull();

    act(() => {
      socketListeners.get('message:delivered')?.({
        conversationId,
        userId: otherUserId,
        deliveredAt: '2026-10-09T10:03:00.000Z',
      });
    });
    await waitFor(() => expect(result.current.otherLastDeliveredAt).toBe('2026-10-09T10:03:00.000Z'));
    expect(result.current.otherLastReadAt).toBeNull();

    act(() => {
      socketListeners.get('message:read')?.({
        conversationId,
        userId: otherUserId,
        readAt: '2001-01-01T00:00:00.000Z',
        readFrom: null,
      });
    });
    expect(result.current.otherLastReadAt).toBeNull();

    resolveFreshConversations([{ ...conversation, otherUserLastReadAt: null, otherUserReadReceiptsSinceAt: null }]);
    await waitFor(() => expect(result.current.conversation?.otherUserLastReadAt).toBeNull());

    act(() => {
      socketListeners.get('message:read')?.({
        conversationId,
        userId: otherUserId,
        readAt: '2001-01-01T00:00:00.000Z',
        readFrom: null,
      });
    });
    expect(result.current.otherLastReadAt).toBe('2001-01-01T00:00:00.000Z');
  });

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

  it('leaves the previous socket room on thread change and leaves the active room on unmount', async () => {
    const secondConversationId = '66666666-6666-4666-8666-666666666666';
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const { rerender, unmount } = renderHook(
      ({ id }) => useChatThread({ conversationId: id, socketOrigin: 'http://localhost:3000' }),
      { initialProps: { id: conversationId }, wrapper: wrapperFor(queryClient) },
    );

    act(() => socketListeners.get('connect')?.(undefined));
    await waitFor(() =>
      expect(socketEmits).toContainEqual({ event: 'conversation:join', payload: { conversationId } }),
    );

    rerender({ id: secondConversationId });
    await waitFor(() =>
      expect(socketEmits).toContainEqual({
        event: 'conversation:leave',
        payload: { conversationId },
      }),
    );
    await waitFor(() =>
      expect(socketEmits).toContainEqual({
        event: 'conversation:join',
        payload: { conversationId: secondConversationId },
      }),
    );

    unmount();
    expect(socketEmits).toContainEqual({
      event: 'conversation:leave',
      payload: { conversationId: secondConversationId },
    });
  });

  it('compensates when a join ACK arrives after that conversation was left', async () => {
    const secondConversationId = '66666666-6666-4666-8666-666666666666';
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    deferNextJoinAck = true;
    const { rerender, unmount } = renderHook(
      ({ id }) => useChatThread({ conversationId: id, socketOrigin: 'http://localhost:3000' }),
      { initialProps: { id: conversationId }, wrapper: wrapperFor(queryClient) },
    );

    act(() => socketListeners.get('connect')?.(undefined));
    await waitFor(() => expect(deferredJoinAcks).toHaveLength(1));

    rerender({ id: secondConversationId });
    await waitFor(() =>
      expect(socketEmits).toContainEqual({
        event: 'conversation:join',
        payload: { conversationId: secondConversationId },
      }),
    );
    expect(socketEmits.filter((item) => item.event === 'conversation:leave' &&
      (item.payload as { conversationId: string }).conversationId === conversationId)).toHaveLength(1);

    act(() => deferredJoinAcks[0]?.({ joined: true }));

    expect(socketEmits.filter((item) => item.event === 'conversation:leave' &&
      (item.payload as { conversationId: string }).conversationId === conversationId)).toHaveLength(2);

    unmount();
    expect(socketEmits.filter((item) => item.event === 'conversation:leave' &&
      (item.payload as { conversationId: string }).conversationId === conversationId)).toHaveLength(2);
    expect(socketEmits).toContainEqual({
      event: 'conversation:leave',
      payload: { conversationId: secondConversationId },
    });
  });
});
