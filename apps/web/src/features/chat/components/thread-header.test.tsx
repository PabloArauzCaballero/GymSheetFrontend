import type { PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConversationSummary, ReadReceiptSettings } from '@/shared/api/schemas';
import { queryKeys } from '@/shared/api/query-keys';
import { chatService } from '@/features/chat/services/chat-service';
import { ThreadHeader } from './thread-header';

vi.mock('@/features/chat/services/chat-service', () => ({
  chatService: {
    listConversations: vi.fn(),
    getReadReceiptSettings: vi.fn(),
    updateReadReceiptSettings: vi.fn(),
  },
}));

const conversationId = '11111111-1111-4111-8111-111111111111';
const secondConversationId = '22222222-2222-4222-8222-222222222222';
const unavailableConversationId = '33333333-3333-4333-8333-333333333333';

const activeConversation: ConversationSummary = {
  conversationId,
  otherUserId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
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

const conversations: ConversationSummary[] = [
  activeConversation,
  { ...activeConversation, conversationId: secondConversationId, otherUserName: 'Beto' },
  {
    ...activeConversation,
    conversationId: unavailableConversationId,
    otherUserName: 'Sistema',
    canWrite: false,
    systemKind: 'CORPORATE',
  },
];

const initialSettings: ReadReceiptSettings = {
  enabled: true,
  defaultEnabled: true,
  conversationOverride: false,
  version: 7,
};

function renderHeader(
  settings = initialSettings,
  getSettings: () => Promise<ReadReceiptSettings> = async () => settings,
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  vi.mocked(chatService.listConversations).mockResolvedValue(conversations);
  vi.mocked(chatService.getReadReceiptSettings).mockImplementation(getSettings);
  function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  render(
    <ThreadHeader
      connectionState="connected"
      conversation={activeConversation}
      onSaveNickname={vi.fn()}
      otherLastSeenAt={null}
      otherOnline={false}
      savingNickname={false}
    />,
    { wrapper: Wrapper },
  );
  return {
    queryClient,
    openMenu: () => fireEvent.click(screen.getByLabelText('Más opciones de conversación')),
  };
}

describe('ThreadHeader read receipt controls', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates only this conversation with the queried version and refreshes its cache', async () => {
    const updated: ReadReceiptSettings = {
      enabled: false,
      defaultEnabled: true,
      conversationOverride: false,
      version: 8,
    };
    vi.mocked(chatService.updateReadReceiptSettings).mockResolvedValue(updated);
    let settingsCalls = 0;
    const { queryClient, openMenu } = renderHeader(initialSettings, async () => {
      settingsCalls += 1;
      return settingsCalls === 1 ? initialSettings : updated;
    });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    openMenu();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Desactivar solo en este chat' })).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Desactivar solo en este chat' }));

    await waitFor(() =>
      expect(vi.mocked(chatService.updateReadReceiptSettings).mock.calls[0]?.[0]).toEqual({
        scope: 'CONVERSATION',
        conversationId,
        enabled: false,
        expectedVersion: 7,
      }),
    );
    await waitFor(() =>
      expect(queryClient.getQueryData(['chat', 'read-receipts', conversationId])).toEqual(updated),
    );
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.conversations });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['chat', 'conversations'] });
  });

  it('sends SELECTED with only the checked writable conversations', async () => {
    vi.mocked(chatService.updateReadReceiptSettings).mockResolvedValue(initialSettings);
    renderHeader();

    fireEvent.click(screen.getByLabelText('Más opciones de conversación'));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Elegir conversaciones…' })).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Elegir conversaciones…' }));
    fireEvent.click(screen.getByText('Beto').closest('label')!);
    fireEvent.click(screen.getByRole('button', { name: 'Activar seleccionados' }));

    await waitFor(() =>
      expect(vi.mocked(chatService.updateReadReceiptSettings).mock.calls[0]?.[0]).toEqual({
        scope: 'SELECTED',
        conversationIds: [conversationId, secondConversationId],
        enabled: true,
        expectedVersion: 7,
      }),
    );
    expect(vi.mocked(chatService.updateReadReceiptSettings).mock.calls[0]?.[0]).not.toHaveProperty(
      'conversationIds',
      expect.arrayContaining([unavailableConversationId]),
    );
  });

  it('uses defaultEnabled, not the active conversation override, for ALL', async () => {
    const settings = { ...initialSettings, enabled: true, defaultEnabled: false };
    vi.mocked(chatService.updateReadReceiptSettings).mockResolvedValue(settings);
    renderHeader(settings);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Activar en todos los chats' })).toBeEnabled(),
    );
    fireEvent.click(screen.getByLabelText('Más opciones de conversación'));
    fireEvent.click(screen.getByRole('button', { name: 'Activar en todos los chats' }));

    await waitFor(() =>
      expect(vi.mocked(chatService.updateReadReceiptSettings).mock.calls[0]?.[0]).toEqual({
        scope: 'ALL',
        enabled: true,
        expectedVersion: 7,
      }),
    );
  });

  it('shows conflicts, refetches the version, and retries with the refreshed expectedVersion', async () => {
    vi.mocked(chatService.updateReadReceiptSettings)
      .mockRejectedValueOnce(new Error('conflict'))
      .mockResolvedValue({ ...initialSettings, version: 9 });
    let settingsCalls = 0;
    renderHeader(initialSettings, async () => {
      settingsCalls += 1;
      return settingsCalls === 1 ? initialSettings : { ...initialSettings, version: 8 };
    });

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Desactivar solo en este chat' })).toBeEnabled(),
    );
    fireEvent.click(screen.getByLabelText('Más opciones de conversación'));
    fireEvent.click(screen.getByRole('button', { name: 'Desactivar solo en este chat' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo guardar. Cierra y vuelve a abrir el menú para actualizar el estado.',
    );
    await waitFor(() => expect(settingsCalls).toBeGreaterThan(1));
    fireEvent.click(screen.getByRole('button', { name: 'Desactivar solo en este chat' }));
    await waitFor(() =>
      expect(vi.mocked(chatService.updateReadReceiptSettings).mock.calls[1]?.[0]).toEqual({
        scope: 'CONVERSATION',
        conversationId,
        enabled: false,
        expectedVersion: 8,
      }),
    );
  });
});
