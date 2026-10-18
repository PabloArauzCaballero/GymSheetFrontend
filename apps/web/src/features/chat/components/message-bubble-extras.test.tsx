import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { messageSchema } from '@/shared/api/schemas';
import { MessageBubble } from './message-bubble';

const ME = '00000000-0000-4000-8000-000000000003';
const OTHER = '00000000-0000-4000-8000-000000000004';

function renderBubble(extra: Record<string, unknown>) {
  const message = messageSchema.parse({
    id: '00000000-0000-4000-8000-000000000001',
    conversationId: '00000000-0000-4000-8000-000000000002',
    senderId: OTHER,
    body: 'Perfecto',
    type: 'text',
    storyReference: null,
    mediaUrl: null,
    mediaMimeType: null,
    viewOnce: false,
    viewed: false,
    locationLat: null,
    locationLng: null,
    createdAt: '2026-10-18T10:00:00.000Z',
    ...extra,
  });
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ul>
        <MessageBubble
          groupedWithPrevious={false}
          message={message}
          mine={false}
          onOpenImage={vi.fn()}
          onRevealViewOnce={vi.fn()}
          revealedUrl={null}
          revealPending={false}
          otherLastDeliveredAt={null}
          otherLastReadAt={null}
          otherReadReceiptsSinceAt={null}
          canEdit={false}
          onEditMessage={vi.fn()}
          viewerId={ME}
          otherName="Ana"
        />
      </ul>
    </QueryClientProvider>,
  );
}

describe('lo nuevo del móvil también se ve en la web', () => {
  it('muestra la cita (con «Tú») y las reacciones de una respuesta', () => {
    renderBubble({
      replyTo: {
        messageId: '00000000-0000-4000-8000-000000000009',
        senderId: ME,
        type: 'text',
        body: 'Llevo las bandas',
        available: true,
      },
      reactions: [
        { userId: ME, emoji: '💪' },
        { userId: OTHER, emoji: '💪' },
      ],
    });
    expect(screen.getByLabelText('Respuesta a Tú: Llevo las bandas')).toBeTruthy();
    expect(screen.getByLabelText('Reacciones: 💪 2. Tu reacción: 💪')).toBeTruthy();
  });

  it('dice «Reenviado» y que el original ya no está', () => {
    renderBubble({
      forwarded: true,
      replyTo: {
        messageId: '00000000-0000-4000-8000-000000000009',
        senderId: OTHER,
        type: 'image',
        body: null,
        available: false,
      },
    });
    expect(screen.getByText('Reenviado')).toBeTruthy();
    expect(
      screen.getByLabelText('Respuesta a Ana: Este mensaje ya no está disponible'),
    ).toBeTruthy();
  });
});
