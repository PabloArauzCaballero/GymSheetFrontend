import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import type { Message } from '@/shared/api/schemas';
import type { chatService as ChatService } from '@/features/chat/services/chat-service';

export const socketListeners = new Map<string, (payload: unknown) => void>();
export const socketEmits: Array<{ event: string; payload: unknown }> = [];
export const deferredJoinAcks: Array<(result: { joined: boolean }) => void> = [];
let deferNextJoinAck = false;

export function deferNextJoin(): void {
  deferNextJoinAck = true;
}

export const socketIoMock = () => ({
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
});

export const chatServiceMock = () => ({
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
});

export const conversationId = '11111111-1111-4111-8111-111111111111';
export const messageId = '22222222-2222-4222-8222-222222222222';

export const privateViewOnceMessage = {
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
} satisfies Message;

export function wrapperFor(queryClient: QueryClient) {
  function QueryWrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return QueryWrapper;
}

/** Estado limpio de sockets y respuestas por defecto antes de cada prueba. */
export function resetThreadMocks(chatService: typeof ChatService): void {
  socketListeners.clear();
  socketEmits.length = 0;
  deferredJoinAcks.length = 0;
  deferNextJoinAck = false;
  vi.mocked(chatService.listMessages).mockResolvedValue([privateViewOnceMessage]);
  vi.mocked(chatService.listConversations).mockResolvedValue([]);
  vi.mocked(chatService.viewMessage).mockResolvedValue(privateViewOnceMessage);
}
