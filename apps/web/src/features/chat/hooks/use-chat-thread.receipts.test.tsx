import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react';
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
import { ThreadHeader } from '@/features/chat/components/thread-header';
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

describe('useChatThread read receipt settings', () => {
  beforeEach(() => resetThreadMocks(chatService));

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

});
