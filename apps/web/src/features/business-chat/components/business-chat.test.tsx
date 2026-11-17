import type { PropsWithChildren } from 'react';
import { conversationControls } from '@gymsheet/domain';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/shared/api/api-error';
import type { ConversationSummary } from '@/shared/api/schemas';
import { ConversationRow } from '@/features/chat/components/conversation-row';
import { MessageComposer } from '@/features/chat/components/message-composer';
import { ThreadHeader } from '@/features/chat/components/thread-header';
import { chatService } from '@/features/chat/services/chat-service';
import { businessChatService } from '../services/business-chat-client';
import { WriteToBusinessButton } from './write-to-business-button';

const mocks = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push, replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }) }));
vi.mock('../services/business-chat-client', () => ({ businessChatService: { open: vi.fn(), block: vi.fn() } }));
vi.mock('@/features/chat/services/chat-service', () => ({
  chatService: { listConversations: vi.fn(), getReadReceiptSettings: vi.fn(), updateReadReceiptSettings: vi.fn() },
}));

const ENTITY = '4e0b2a6c-1f3d-4b8a-9c2e-7d6f5a4b3c21';
const CONVERSATION = '11111111-1111-4111-8111-111111111111';

const businessChat: ConversationSummary = {
  conversationId: CONVERSATION,
  otherUserId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  otherUserName: 'Ana Pérez',
  otherUserPhotoUrl: null,
  otherUserOnline: true,
  otherUserLastSeenAt: null,
  lastMessage: '¿Tienen plan mensual?',
  lastMessageAt: null,
  canWrite: true,
  systemKind: null,
  kind: 'BUSINESS',
  businessEntityId: ENTITY,
  nickname: null,
  otherUserLastDeliveredAt: null,
  otherUserLastReadAt: null,
  otherUserReadReceiptsSinceAt: null,
  disappearingSeconds: null,
};

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(chatService.listConversations).mockResolvedValue([businessChat]);
  vi.mocked(chatService.getReadReceiptSettings).mockResolvedValue({ enabled: true, defaultEnabled: true, conversationOverride: false, version: 1 });
});

describe('WriteToBusinessButton', () => {
  it('opens the chat and goes to it', async () => {
    vi.mocked(businessChatService.open).mockResolvedValue({ conversationId: CONVERSATION });
    render(<WriteToBusinessButton entityId={ENTITY} returnTo="/@gym" viewer="person" />, { wrapper: wrapper() });
    fireEvent.click(screen.getByRole('button', { name: 'Escribir' }));
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith(`/chat/${CONVERSATION}`));
    expect(businessChatService.open).toHaveBeenCalledWith(ENTITY);
  });

  it('says the business blocked you, and does not navigate', async () => {
    vi.mocked(businessChatService.open).mockRejectedValue(new ApiError({ message: 'Este negocio no recibe tus mensajes.', status: 403, kind: 'forbidden', code: 'BUSINESS_CHAT_BLOCKED' }));
    render(<WriteToBusinessButton entityId={ENTITY} returnTo="/@gym" viewer="person" />, { wrapper: wrapper() });
    fireEvent.click(screen.getByRole('button', { name: 'Escribir' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Este negocio no recibe tus mensajes');
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it('offers to verify the email when the backend asks for it', async () => {
    vi.mocked(businessChatService.open).mockRejectedValue(new ApiError({ message: 'Verifica.', status: 403, kind: 'forbidden', code: 'EMAIL_VERIFICATION_REQUIRED' }));
    render(<WriteToBusinessButton entityId={ENTITY} returnTo="/@gym" viewer="person" />, { wrapper: wrapper() });
    fireEvent.click(screen.getByRole('button', { name: 'Escribir' }));
    expect(await screen.findByRole('link', { name: 'Verificar mi correo' })).toHaveAttribute('href', '/verificar-correo');
  });

  it('is hidden from a business and asks a visitor to sign in', () => {
    const { container } = render(<WriteToBusinessButton entityId={ENTITY} returnTo="/@gym" viewer="business" />, { wrapper: wrapper() });
    expect(container).toBeEmptyDOMElement();
    render(<WriteToBusinessButton entityId={ENTITY} returnTo="/@gym" viewer="anonymous" />, { wrapper: wrapper() });
    expect(screen.getByRole('link', { name: 'Inicia sesión para escribir' })).toHaveAttribute('href', '/login?returnTo=%2F%40gym');
  });
});

describe('business thread controls', () => {
  function header(viewer: 'person' | 'business') {
    render(
      <ThreadHeader
        connectionState="disconnected"
        controls={conversationControls(businessChat, viewer)}
        conversation={businessChat}
        onSaveNickname={vi.fn()}
        otherLastSeenAt={null}
        otherOnline
        savingNickname={false}
      />,
      { wrapper: wrapper() },
    );
  }

  it('the business sees «Bloquear» and no presence, socket badge or read-receipt menu', () => {
    header('business');
    expect(screen.getByRole('button', { name: 'Bloquear a esta persona' })).toBeVisible();
    expect(screen.queryByText('Conectando…')).toBeNull();
    expect(screen.queryByText('En línea')).toBeNull();
    expect(screen.queryByLabelText('Más opciones de conversación')).toBeNull();
    expect(chatService.getReadReceiptSettings).not.toHaveBeenCalled();
  });

  it('the person sees the «Negocio» mark and no «Bloquear»', () => {
    header('person');
    expect(screen.getByText('Negocio')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Bloquear a esta persona' })).toBeNull();
  });

  it('the composer of a business chat has no location button', () => {
    render(<MessageComposer allowLocation={false} onSendLocation={vi.fn()} onSendMedia={vi.fn()} onSendText={vi.fn()} sending={false} sendingMedia={false} />);
    expect(screen.queryByRole('button', { name: 'Compartir mi ubicación' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Adjuntar una foto o un vídeo' })).toBeVisible();
  });

  it('the inbox row links to the business thread and hides presence', () => {
    render(<ul><ConversationRow conversation={businessChat} href={`/negocio/mensajes/${CONVERSATION}`} viewer="business" /></ul>);
    expect(screen.getByRole('link')).toHaveAttribute('href', `/negocio/mensajes/${CONVERSATION}`);
    expect(screen.queryByText('En línea')).toBeNull();
    expect(screen.queryByText('Negocio')).toBeNull();
  });
});

describe('BlockPersonButton', () => {
  it('confirms, blocks and returns to the inbox', async () => {
    vi.mocked(businessChatService.block).mockResolvedValue({ conversationId: CONVERSATION, blocked: true });
    render(
      <ThreadHeader
        connectionState="disconnected"
        controls={conversationControls(businessChat, 'business')}
        conversation={businessChat}
        onSaveNickname={vi.fn()}
        otherLastSeenAt={null}
        otherOnline={false}
        savingNickname={false}
      />,
      { wrapper: wrapper() },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Bloquear a esta persona' }));
    expect(await screen.findByRole('dialog', { name: '¿Bloquear a esta persona?' })).toBeVisible();
    expect(businessChatService.block).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Bloquear' }));
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/negocio/mensajes'));
    expect(businessChatService.block).toHaveBeenCalledWith(CONVERSATION);
  });
});
