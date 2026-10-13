import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { messageSchema } from '@/shared/api/schemas';
import { MessageBubble } from './message-bubble';

describe('training invitation chat events', () => {
  it('renders an accepted invitation as an accessible read-only timeline row', () => {
    const event = messageSchema.parse({
      id: '00000000-0000-4000-8000-000000000001',
      conversationId: '00000000-0000-4000-8000-000000000002',
      senderId: null,
      type: 'system',
      systemEvent: {
        kind: 'TRAINING_INVITE_ACCEPTED',
        invitationId: '00000000-0000-4000-8000-000000000003',
        acceptedRevision: 2,
        startsAt: '2026-10-11T15:00:00.000Z',
        timeZone: 'America/La_Paz',
        placeLabel: 'Gimnasio Central',
      },
      createdAt: '2026-10-10T15:00:00.000Z',
    });

    render(
      <MessageBubble
        groupedWithPrevious={false}
        message={event}
        mine={false}
        onOpenImage={vi.fn()}
        onRevealViewOnce={vi.fn()}
        revealedUrl={null}
        revealPending={false}
        otherLastDeliveredAt={null}
        otherLastReadAt={null}
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent('Entrenamiento acordado');
    expect(screen.getByRole('status')).toHaveTextContent('Gimnasio Central');
    expect(screen.queryByRole('button')).toBeNull();
  });


  it('marks a cancelled accepted invitation as cancelled', () => {
    const event = messageSchema.parse({
      id: '00000000-0000-4000-8000-000000000004',
      conversationId: '00000000-0000-4000-8000-000000000002',
      senderId: null,
      type: 'system',
      systemEvent: {
        kind: 'TRAINING_INVITE_ACCEPTED',
        invitationId: '00000000-0000-4000-8000-000000000003',
        acceptedRevision: 2,
        startsAt: '2026-10-11T15:00:00.000Z',
        timeZone: 'America/La_Paz',
        placeLabel: 'Gimnasio Central',
        cancelledAt: '2026-10-10T16:00:00.000Z',
      },
      createdAt: '2026-10-10T15:00:00.000Z',
    });

    render(
      <MessageBubble
        groupedWithPrevious={false}
        message={event}
        mine={false}
        onOpenImage={vi.fn()}
        onRevealViewOnce={vi.fn()}
        revealedUrl={null}
        revealPending={false}
        otherLastDeliveredAt={null}
        otherLastReadAt={null}
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent('Entrenamiento cancelado');
    expect(screen.queryByText('Entrenamiento acordado')).toBeNull();
  });
});
