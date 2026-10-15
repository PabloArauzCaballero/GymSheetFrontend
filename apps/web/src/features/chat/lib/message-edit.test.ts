import { describe, expect, it } from 'vitest';
import { messageSchema, type Message } from '@/shared/api/schemas';
import { applyMessageUpdated, canEditMessage } from './message-edit';

const message: Message = {
  id: '00000000-0000-4000-8000-000000000001',
  conversationId: '00000000-0000-4000-8000-000000000002',
  senderId: '00000000-0000-4000-8000-000000000003',
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

describe('chat message editing', () => {
  it('allows only the author to edit text messages within the 15 minute window', () => {
    const now = new Date('2026-10-09T10:14:59.000Z');
    expect(canEditMessage(message, '00000000-0000-4000-8000-000000000003', now)).toBe(true);
    expect(canEditMessage(message, '00000000-0000-4000-8000-000000000004', now)).toBe(false);
    expect(
      canEditMessage({ ...message, type: 'image' }, '00000000-0000-4000-8000-000000000003', now),
    ).toBe(false);
    expect(
      canEditMessage(
        message,
        '00000000-0000-4000-8000-000000000003',
        new Date('2026-10-09T10:15:01.000Z'),
      ),
    ).toBe(false);
  });

  it('replaces only the matching message when an edit event arrives', () => {
    const edited = { ...message, body: 'updated text', editedAt: '2026-10-09T10:01:00.000Z' };
    expect(messageSchema.parse(edited).editedAt).toBe(edited.editedAt);
    expect(applyMessageUpdated([message], edited, message.conversationId)).toEqual([edited]);
    expect(
      applyMessageUpdated(
        [message],
        { ...edited, conversationId: '00000000-0000-4000-8000-000000000004' },
        message.conversationId,
      ),
    ).toEqual([message]);
  });

  it('does not replace a system event with an ordinary edit event', () => {
    const event = messageSchema.parse({
      id: message.id,
      conversationId: message.conversationId,
      senderId: null,
      type: 'system',
      systemEvent: {
        kind: 'TRAINING_INVITE_ACCEPTED',
        invitationId: '00000000-0000-4000-8000-000000000005',
        acceptedRevision: 2,
        startsAt: '2026-10-11T15:00:00.000Z',
        timeZone: 'America/La_Paz',
        placeLabel: 'Gimnasio Central',
      },
      createdAt: message.createdAt,
    });

    expect(applyMessageUpdated([event], message, message.conversationId)).toEqual([event]);
  });
});
