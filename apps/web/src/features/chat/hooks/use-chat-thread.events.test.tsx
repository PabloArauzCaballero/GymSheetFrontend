import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import type { Message } from '@/shared/api/schemas';
import { ApiError } from '@/shared/api/api-error';
import { queryKeys } from '@/shared/api/query-keys';
import { chatService } from '@/features/chat/services/chat-service';
import {
  conversationId,
  messageId,
  privateViewOnceMessage,
  resetThreadMocks,
  socketListeners,
  wrapperFor,
} from './use-chat-thread.test-support';
import { useChatThread } from './use-chat-thread';

vi.mock('socket.io-client', async () =>
  (await import('./use-chat-thread.test-support')).socketIoMock());
vi.mock('@/features/chat/services/chat-service', async () =>
  (await import('./use-chat-thread.test-support')).chatServiceMock());

describe('useChatThread live event reconciliation', () => {
  beforeEach(() => resetThreadMocks(chatService));

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

});
