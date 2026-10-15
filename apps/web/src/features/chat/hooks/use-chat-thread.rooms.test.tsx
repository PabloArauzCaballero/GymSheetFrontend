import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  conversationId,
  deferNextJoin,
  deferredJoinAcks,
  resetThreadMocks,
  socketEmits,
  socketListeners,
  wrapperFor,
} from './use-chat-thread.test-support';
import { chatService } from '@/features/chat/services/chat-service';
import { useChatThread } from './use-chat-thread';

vi.mock('socket.io-client', async () =>
  (await import('./use-chat-thread.test-support')).socketIoMock());
vi.mock('@/features/chat/services/chat-service', async () =>
  (await import('./use-chat-thread.test-support')).chatServiceMock());

describe('useChatThread socket rooms', () => {
  beforeEach(() => resetThreadMocks(chatService));

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
    deferNextJoin();
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
