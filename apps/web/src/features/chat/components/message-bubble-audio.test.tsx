import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Message } from '@/shared/api/schemas';
import { MessageBubble } from './message-bubble';

const audioMessage: Message = {
  id: '00000000-0000-4000-8000-000000000001',
  conversationId: '00000000-0000-4000-8000-000000000002',
  senderId: '00000000-0000-4000-8000-000000000003',
  body: null,
  type: 'audio',
  storyReference: null,
  mediaUrl: '/me/conversations/00000000-0000-4000-8000-000000000002/messages/00000000-0000-4000-8000-000000000001/media',
  mediaMimeType: 'audio/mp4',
  viewOnce: false,
  viewed: false,
  locationLat: null,
  locationLng: null,
  createdAt: '2026-10-09T10:00:00.000Z',
};

describe('MessageBubble audio', () => {
  it('shows the server-provided story reference without loading story media', () => {
    render(
      <MessageBubble
        groupedWithPrevious={false}
        message={{ ...audioMessage, storyReference: { storyId: '00000000-0000-4000-8000-000000000004', available: true } }}
        mine={false}
        onEditMessage={vi.fn()}
        canEdit={false}
        onOpenImage={vi.fn()}
        onRevealViewOnce={vi.fn()}
        revealedUrl={null}
        revealPending={false}
        otherLastDeliveredAt={null}
        otherLastReadAt={null}
        otherReadReceiptsSinceAt={null}
      />,
    );

    expect(screen.getByLabelText('Referencia a una story')).toHaveTextContent('Respuesta a una story');
  });

  it('plays an authenticated audio attachment through the media proxy', () => {
    render(
      <MessageBubble
        groupedWithPrevious={false}
        message={audioMessage}
        mine={false}
        onEditMessage={vi.fn()}
        canEdit={false}
        onOpenImage={vi.fn()}
        onRevealViewOnce={vi.fn()}
        revealedUrl={null}
        revealPending={false}
        otherLastDeliveredAt={null}
        otherLastReadAt={null}
        otherReadReceiptsSinceAt={null}
      />,
    );

    const player = screen.getByLabelText('Reproducir mensaje de audio') as HTMLAudioElement;
    expect(player.tagName).toBe('AUDIO');
    expect(player.controls).toBe(true);
    expect(player.getAttribute('src')).toBe(
      '/api/backend/me/conversations/00000000-0000-4000-8000-000000000002/messages/00000000-0000-4000-8000-000000000001/media',
    );
  });
});
