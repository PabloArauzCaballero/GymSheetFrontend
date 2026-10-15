import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Message } from '@/shared/api/schemas';
import { MessageThreadClient } from './message-thread-client';

const { threadState } = vi.hoisted(() => ({ threadState: { current: null as unknown } }));

vi.mock('@/features/chat/hooks/use-chat-thread', () => ({
  useChatThread: () => threadState.current,
}));
vi.mock('next/link', () => ({ default: ({ children }: { children: React.ReactNode }) => <a>{children}</a> }));
vi.mock('@/shared/components/media/domain-image', () => ({
  DomainImage: ({ src }: { src: string }) => <span data-src={src} data-testid="viewer-image" />,
}));
vi.mock('@/shared/components/feedback/error-panel', () => ({ ErrorPanel: () => null }));
vi.mock('@/shared/components/feedback/skeleton', () => ({
  SkeletonPageHeader: () => null,
  SkeletonScreen: () => null,
  SkeletonThread: () => null,
}));
vi.mock('@/shared/components/ui/button', () => ({ Button: () => null }));
vi.mock('@/shared/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) => (
    <div data-open={open} data-testid="viewer-dialog">{children}</div>
  ),
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('./message-bubble', () => ({
  MessageBubble: ({ message, focusedForStoryReply, onOpenImage, onRevealViewOnce }: {
    message: Message;
    focusedForStoryReply?: boolean;
    onOpenImage: (url: string) => void;
    onRevealViewOnce: (messageId: string) => void;
  }) => (
    <li id={`message-${message.id}`} tabIndex={-1} data-focused={focusedForStoryReply ?? false}>
      <button onClick={() => onOpenImage('/private/photo.jpg')}>Open photo</button>
      <button onClick={() => onRevealViewOnce('message-1')}>Reveal once</button>
    </li>
  ),
}));
vi.mock('./message-composer', () => ({ MessageComposer: () => null }));
vi.mock('./thread-header', () => ({ ThreadHeader: () => null }));

const message: Message = {
  id: 'message-1',
  conversationId: 'conversation-1',
  senderId: 'sender-1',
  body: 'caption privada',
  type: 'image',
  storyReference: null,
  mediaUrl: '/private/photo.jpg',
  mediaMimeType: 'image/jpeg',
  viewOnce: true,
  viewed: true,
  locationLat: null,
  locationLng: null,
  createdAt: '2026-10-09T10:00:00.000Z',
};

function makeThread() {
  let lateSuccess: ((value: Message) => void) | undefined;
  const thread = {
    history: { isLoading: false, isError: false, error: new Error('Not found'), data: [message], refetch: vi.fn() },
    conversation: { conversationId: message.conversationId, canWrite: true },
    conversationUnavailable: false as boolean,
    isValidatingHistory: false as boolean,
    conversationRevoked: false,
    messages: [message],
    hasMoreOlder: false,
    loadingOlder: false,
    loadOlderMessages: vi.fn(),
    latestMessageId: message.id,
    connectionState: 'connected',
    otherLastSeenAt: null,
    otherOnline: false,
    otherLastDeliveredAt: null,
    otherLastReadAt: null,
    otherReadReceiptsSinceAt: null,
    isMessageDeleted: vi.fn().mockReturnValue(false),
    setNickname: { mutate: vi.fn(), isPending: false },
    sendLocation: vi.fn(),
    sendMedia: vi.fn(),
    sendText: vi.fn(),
    sending: false,
    sendingMedia: false,
    revealedMedia: {},
    revealViewOnce: {
      mutate: vi.fn((_id: string, options: { onSuccess: (value: Message) => void }) => {
        lateSuccess = options.onSuccess;
      }),
      isPending: false,
    },
  };
  return { thread, completeLateReveal: (value: Message) => lateSuccess?.(value) };
}

describe('MessageThreadClient deleted media viewer', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('closes an open image when its message becomes a tombstone', () => {
    const { thread } = makeThread();
    threadState.current = thread;
    const view = render(<MessageThreadClient conversationId={message.conversationId} currentUserId="viewer" socketOrigin="http://localhost" />);

    fireEvent.click(screen.getByRole('button', { name: 'Open photo' }));
    expect(screen.getByTestId('viewer-dialog').getAttribute('data-open')).toBe('true');

    thread.messages = [{ ...message, body: 'Mensaje eliminado', type: 'text', mediaUrl: null, viewOnce: false }];
    thread.isMessageDeleted.mockReturnValue(true);
    view.rerender(<MessageThreadClient conversationId={message.conversationId} currentUserId="viewer" socketOrigin="http://localhost" />);

    expect(screen.getByTestId('viewer-dialog').getAttribute('data-open')).toBe('false');
    expect(screen.queryByTestId('viewer-image')).toBeNull();
  });

  it('does not open the viewer from a late view-once response after deletion', () => {
    const { thread, completeLateReveal } = makeThread();
    threadState.current = thread;
    const view = render(<MessageThreadClient conversationId={message.conversationId} currentUserId="viewer" socketOrigin="http://localhost" />);

    fireEvent.click(screen.getByRole('button', { name: 'Reveal once' }));
    thread.messages = [{ ...message, body: 'Mensaje eliminado', type: 'text', mediaUrl: null, viewOnce: false }];
    thread.isMessageDeleted.mockReturnValue(true);
    view.rerender(<MessageThreadClient conversationId={message.conversationId} currentUserId="viewer" socketOrigin="http://localhost" />);
    act(() => completeLateReveal({ ...message, mediaUrl: '/private/revealed.jpg' }));

    expect(screen.getByTestId('viewer-dialog').getAttribute('data-open')).toBe('false');
    expect(screen.queryByTestId('viewer-image')).toBeNull();
  });

  it('shows an unavailable state instead of stale history after a not-found response', () => {
    const { thread } = makeThread();
    threadState.current = thread;

    const view = render(<MessageThreadClient conversationId={message.conversationId} currentUserId="viewer" socketOrigin="http://localhost" />);
    fireEvent.click(screen.getByRole('button', { name: 'Open photo' }));
    expect(screen.getByTestId('viewer-image')).toBeInTheDocument();

    thread.conversationUnavailable = true;
    thread.history.isError = true;
    view.rerender(<MessageThreadClient conversationId={message.conversationId} currentUserId="viewer" socketOrigin="http://localhost" />);

    expect(screen.getByRole('alert')).toHaveTextContent('Esta conversación ya no está disponible.');
    expect(screen.queryByRole('log')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Open photo' })).toBeNull();

    thread.conversationUnavailable = false;
    thread.history.isError = false;
    view.rerender(<MessageThreadClient conversationId={message.conversationId} currentUserId="viewer" socketOrigin="http://localhost" />);
    expect(screen.getByTestId('viewer-dialog').getAttribute('data-open')).toBe('false');
    expect(screen.queryByTestId('viewer-image')).toBeNull();
  });

  it('hides cached messages and an open viewer while history is being validated', () => {
    const { thread } = makeThread();
    threadState.current = thread;
    const view = render(<MessageThreadClient conversationId={message.conversationId} currentUserId="viewer" socketOrigin="http://localhost" />);
    fireEvent.click(screen.getByRole('button', { name: 'Open photo' }));
    expect(screen.getByTestId('viewer-image')).toBeInTheDocument();

    thread.isValidatingHistory = true;
    view.rerender(<MessageThreadClient conversationId={message.conversationId} currentUserId="viewer" socketOrigin="http://localhost" />);

    expect(screen.getByText('Verificando disponibilidad de la conversación…')).toBeInTheDocument();
    expect(screen.queryByRole('log')).toBeNull();
    expect(screen.queryByTestId('viewer-image')).toBeNull();
  });
});

describe('MessageThreadClient story reply navigation', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('scrolls to and focuses the returned story reply message', () => {
    const { thread } = makeThread();
    threadState.current = thread;

    render(
      <MessageThreadClient
        conversationId={message.conversationId}
        currentUserId="viewer"
        socketOrigin="http://localhost"
        storyReplyMessageId={message.id}
      />,
    );

    const target = document.getElementById(`message-${message.id}`);
    expect(target).not.toBeNull();
    expect(target).toHaveFocus();
    expect(target?.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
    expect(target?.getAttribute('data-focused')).toBe('true');
  });

  it('loads older pages when the returned message is not in the first history page', () => {
    const { thread } = makeThread();
    thread.messages = [{ ...message, id: 'older-message' }];
    thread.hasMoreOlder = true;
    threadState.current = thread;

    render(
      <MessageThreadClient
        conversationId={message.conversationId}
        currentUserId="viewer"
        socketOrigin="http://localhost"
        storyReplyMessageId="reply-not-loaded"
      />,
    );

    expect(thread.loadOlderMessages).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status')).toHaveTextContent('Buscando la respuesta');
  });

  it('reports when the reply is absent and no older page remains', () => {
    const { thread } = makeThread();
    thread.messages = [{ ...message, id: 'other-message' }];
    threadState.current = thread;

    render(
      <MessageThreadClient
        conversationId={message.conversationId}
        currentUserId="viewer"
        socketOrigin="http://localhost"
        storyReplyMessageId="reply-missing"
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent('No se encontró la respuesta a la story');
  });
});
