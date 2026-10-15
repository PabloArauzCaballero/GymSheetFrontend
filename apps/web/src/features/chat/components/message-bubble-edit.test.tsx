import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { messageSchema, type Message } from '@/shared/api/schemas';
import { canEditMessage } from '@/features/chat/lib/message-edit';
import { MessageBubble } from './message-bubble';

const message: Message = {
  id: 'message-1',
  conversationId: 'conversation-1',
  senderId: 'sender-1',
  body: 'original text',
  type: 'text',
  storyReference: null,
  mediaUrl: null,
  mediaMimeType: null,
  viewOnce: false,
  viewed: false,
  locationLat: null,
  locationLng: null,
  createdAt: '2026-10-09T10:00:00.000Z',
  editedAt: null,
};

function renderBubble(onEditMessage = vi.fn()) {
  return render(
    <MessageBubble
      groupedWithPrevious={false}
      message={message}
      mine
      onEditMessage={onEditMessage}
      canEdit
      onOpenImage={vi.fn()}
      onRevealViewOnce={vi.fn()}
      revealedUrl={null}
      revealPending={false}
      otherLastDeliveredAt={null}
      otherLastReadAt={null}
      otherReadReceiptsSinceAt={null}
    />,
  );
}

describe('MessageBubble editing', () => {
  it('renders a training system event as a neutral accessible line with no message actions', () => {
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
        canEdit
        onEditMessage={vi.fn()}
        onOpenImage={vi.fn()}
        onRevealViewOnce={vi.fn()}
        revealedUrl={null}
        revealPending={false}
        otherLastDeliveredAt={null}
        otherLastReadAt={null}
        otherReadReceiptsSinceAt={null}
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent('Entrenamiento acordado para');
    expect(screen.getByRole('status')).toHaveTextContent('Gimnasio Central');
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('announces an unavailable story reference and keeps the original reply text', () => {
    const storyId = '00000000-0000-4000-8000-000000000004';
    const parsed = messageSchema.parse({
      ...message,
      id: '00000000-0000-4000-8000-000000000001',
      conversationId: '00000000-0000-4000-8000-000000000002',
      senderId: '00000000-0000-4000-8000-000000000003',
      storyReference: { storyId, available: false },
    });

    render(
      <MessageBubble
        groupedWithPrevious={false}
        message={parsed}
        mine
        canEdit={false}
        onEditMessage={vi.fn()}
        onOpenImage={vi.fn()}
        onRevealViewOnce={vi.fn()}
        revealedUrl={null}
        revealPending={false}
        otherLastDeliveredAt={null}
        otherLastReadAt={null}
        otherReadReceiptsSinceAt={null}
      />,
    );

    expect(parsed.storyReference).toEqual({ storyId, available: false });
    expect(screen.getByLabelText('Referencia a una story')).toHaveTextContent('Historia no disponible');
    expect(screen.getByText('original text')).toBeInTheDocument();
  });

  it('opens the edit field from the message menu and saves the replacement text', () => {
    const onEditMessage = vi.fn();
    renderBubble(onEditMessage);

    fireEvent.click(screen.getByRole('button', { name: 'Más opciones del mensaje' }));
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Editar mensaje' }), {
      target: { value: 'updated text' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar edición' }));

    expect(onEditMessage).toHaveBeenCalledWith('message-1', 'updated text');
  });

  it('shows the edited label when the message has an edit timestamp', () => {
    render(
      <MessageBubble
        groupedWithPrevious={false}
        message={{ ...message, editedAt: '2026-10-09T10:01:00.000Z' }}
        mine
        canEdit={false}
        onEditMessage={vi.fn()}
        onOpenImage={vi.fn()}
        onRevealViewOnce={vi.fn()}
        revealedUrl={null}
        revealPending={false}
        otherLastDeliveredAt={null}
        otherLastReadAt={null}
        otherReadReceiptsSinceAt={null}
      />,
    );

    expect(screen.getByText('Editado')).toBeInTheDocument();
  });

  it('preserves deletedAt and hides the edit option for a recent tombstone', () => {
    const deletedAt = '2026-10-09T10:00:30.000Z';
    const tombstone = messageSchema.parse({
      ...message,
      id: '00000000-0000-4000-8000-000000000001',
      conversationId: '00000000-0000-4000-8000-000000000002',
      senderId: '00000000-0000-4000-8000-000000000003',
      body: 'Mensaje eliminado',
      deletedAt,
    });
    expect(tombstone.deletedAt).toBe(deletedAt);

    render(
      <MessageBubble
        groupedWithPrevious={false}
        message={tombstone}
        mine
        canEdit={canEditMessage(tombstone, tombstone.senderId ?? '', new Date('2026-10-09T10:01:00.000Z'))}
        onEditMessage={vi.fn()}
        onOpenImage={vi.fn()}
        onRevealViewOnce={vi.fn()}
        revealedUrl={null}
        revealPending={false}
        otherLastDeliveredAt={null}
        otherLastReadAt={null}
        otherReadReceiptsSinceAt={null}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Más opciones del mensaje' })).not.toBeInTheDocument();
  });
});
