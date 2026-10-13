import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest, downloadFromApi } from '@/shared/api/api-client';
import {
  listedTrainingInvitationSchema,
  sharedSessionSchema,
  trainingInvitationSchema,
  trainingInvitationsService,
} from './training-invitations-service';

vi.mock('@/shared/api/api-client', () => ({ apiRequest: vi.fn(), downloadFromApi: vi.fn() }));

const inviteId = '11111111-1111-4111-8111-111111111111';
const actorId = '22222222-2222-4222-8222-222222222222';
const recipientId = '33333333-3333-4333-8333-333333333333';
const invite = {
  id: inviteId,
  state: 'PENDING',
  currentRevision: 1,
  revisions: [
    {
      revision: 1,
      proposerId: actorId,
      startsAt: '2030-06-02T14:00:00.000Z',
      timeZone: 'UTC',
      durationMinutes: 60,
      place: { kind: 'PUBLIC_PLACE', label: 'Parque Central' },
      mode: 'OWN_ROUTINES',
      createdAt: '2030-06-01T14:00:00.000Z',
    },
  ],
  participants: [actorId, recipientId],
  createdAt: '2030-06-01T14:00:00.000Z',
  updatedAt: '2030-06-01T14:00:00.000Z',
};

describe('trainingInvitationsService.create', () => {
  beforeEach(() => vi.clearAllMocks());

  it('POSTs the strict API payload to the exact create endpoint', async () => {
    vi.mocked(apiRequest).mockResolvedValue(invite);
    const body = {
      recipientId,
      startsAt: '2030-06-02T14:00:00.000Z',
      timeZone: 'UTC',
      durationMinutes: 60,
      place: { kind: 'PUBLIC_PLACE' as const, label: 'Parque Central' },
      mode: 'OWN_ROUTINES' as const,
      clientRequestId: '44444444-4444-4444-8444-444444444444',
    };

    await trainingInvitationsService.create(body);

    expect(apiRequest).toHaveBeenCalledWith('/me/training-invitations', expect.anything(), {
      method: 'POST',
      body,
    });
  });

  it('validates the server invitation response schema', () => {
    expect(trainingInvitationSchema.parse(invite)).toEqual(invite);
    expect(trainingInvitationSchema.safeParse({ ...invite, unexpected: true }).success).toBe(false);
  });

  it('rejects extra client fields instead of forwarding them', () => {
    expect(() =>
      trainingInvitationsService.create({
        recipientId,
        startsAt: '2030-06-02T14:00:00.000Z',
        timeZone: 'UTC',
        durationMinutes: 60,
        place: { kind: 'PUBLIC_PLACE', label: 'Parque Central' },
        mode: 'OWN_ROUTINES',
        clientRequestId: '44444444-4444-4444-8444-444444444444',
        inviteId,
      } as never),
    ).toThrow();
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it('requires a selected routine for shared sessions and only sends it in that mode', async () => {
    const base = {
      recipientId,
      startsAt: '2030-06-02T14:00:00.000Z',
      timeZone: 'UTC',
      durationMinutes: 60,
      place: { kind: 'PUBLIC_PLACE' as const, label: 'Parque Central' },
      clientRequestId: '44444444-4444-4444-8444-444444444444',
    };
    expect(() => trainingInvitationsService.create({ ...base, mode: 'SHARED_SESSION' })).toThrow();
    const body = {
      ...base,
      mode: 'SHARED_SESSION' as const,
      routineSessionId: '55555555-5555-4555-8555-555555555555',
    };
    vi.mocked(apiRequest).mockResolvedValue(invite);

    await trainingInvitationsService.create(body);

    expect(apiRequest).toHaveBeenCalledWith('/me/training-invitations', expect.anything(), {
      method: 'POST',
      body,
    });
    expect(() =>
      trainingInvitationsService.create({
        ...base,
        mode: 'OWN_ROUTINES',
        routineSessionId: body.routineSessionId,
      } as never),
    ).toThrow();
  });
});

describe('trainingInvitationsService.list/respond', () => {
  beforeEach(() => vi.clearAllMocks());

  it('validates a meeting and current response from the list', async () => {
    const listed = {
      ...invite,
      state: 'ACCEPTED',
      response: {
        decision: 'ACCEPT',
        respondedBy: recipientId,
        revision: 1,
        respondedAt: '2030-06-01T15:00:00.000Z',
      },
      meeting: {
        id: '55555555-5555-4555-8555-555555555555',
        acceptedRevision: 1,
        startsAt: '2030-06-02T14:00:00.000Z',
        timeZone: 'UTC',
        placeLabel: 'Parque Central',
        cancelledAt: null,
      },
    };
    vi.mocked(apiRequest).mockResolvedValue([listed]);

    expect(await trainingInvitationsService.list()).toEqual([listed]);
    expect(apiRequest).toHaveBeenCalledWith('/me/training-invitations', expect.anything());
    expect(listedTrainingInvitationSchema.parse(listed)).toEqual(listed);
    expect(
      listedTrainingInvitationSchema.safeParse({ ...listed, meeting: { id: inviteId } }).success,
    ).toBe(false);
  });

  it('responds to the exact invitation and revision with an idempotency key', async () => {
    vi.mocked(apiRequest).mockResolvedValue({ ...invite, state: 'ACCEPTED', response: null });
    const body = {
      decision: 'ACCEPT' as const,
      expectedRevision: 1,
      clientRequestId: '44444444-4444-4444-8444-444444444444',
    };

    await trainingInvitationsService.respond(inviteId, body);

    expect(apiRequest).toHaveBeenCalledWith(
      `/me/training-invitations/${inviteId}/respond`,
      expect.anything(),
      { method: 'POST', body },
    );
    expect(() => trainingInvitationsService.respond('invalid', body)).toThrow();
  });

  it('validates decline responses with the same current revision contract', async () => {
    const response = {
      ...invite,
      state: 'DECLINED' as const,
      response: {
        decision: 'DECLINE' as const,
        respondedBy: recipientId,
        revision: 2,
        respondedAt: '2030-06-01T15:00:00.000Z',
      },
    };
    vi.mocked(apiRequest).mockResolvedValue(response as never);
    const body = {
      expectedRevision: 2,
      decision: 'DECLINE' as const,
      clientRequestId: '33333333-3333-4333-8333-333333333333',
    };
    await trainingInvitationsService.respond(inviteId, body);
    expect(apiRequest).toHaveBeenCalledWith(
      `/me/training-invitations/${inviteId}/respond`,
      expect.anything(),
      expect.objectContaining({ body }),
    );
  });
});

describe('trainingInvitationsService.exportCalendar', () => {
  beforeEach(() => vi.clearAllMocks());

  it('downloads the ICS from the exact authenticated BFF path with a stable filename', async () => {
    vi.mocked(downloadFromApi).mockResolvedValue(undefined);

    await trainingInvitationsService.exportCalendar(inviteId);
    await trainingInvitationsService.exportCalendar(inviteId);

    expect(downloadFromApi).toHaveBeenCalledTimes(2);
    expect(downloadFromApi).toHaveBeenNthCalledWith(
      1,
      `/me/training-invitations/${inviteId}/calendar.ics`,
      `gymsheet-entrenamiento-${inviteId}.ics`,
    );
    expect(vi.mocked(downloadFromApi).mock.calls[1]).toEqual(
      vi.mocked(downloadFromApi).mock.calls[0],
    );
    expect(() => trainingInvitationsService.exportCalendar('invalid')).toThrow();
  });
});

describe('trainingInvitationsService.sharedSession', () => {
  beforeEach(() => vi.clearAllMocks());

  it('reads the sanitized frozen snapshot and rejects private workout fields', async () => {
    const snapshot = {
      inviteId,
      routineId: '55555555-5555-4555-8555-555555555555',
      revision: 1,
      name: 'Fuerza A',
      exercises: [
        {
          exerciseId: '66666666-6666-4666-8666-666666666666',
          exerciseName: 'Press banca',
          order: 1,
          targetSets: 3,
          repsMin: 8,
          repsMax: 12,
          restSeconds: 90,
        },
      ],
    };
    vi.mocked(apiRequest).mockResolvedValue(snapshot);

    expect(await trainingInvitationsService.sharedSession(inviteId)).toEqual(snapshot);
    expect(apiRequest).toHaveBeenCalledWith(
      `/me/training-invitations/${inviteId}/shared-session`,
      expect.anything(),
    );
    expect(sharedSessionSchema.safeParse({ ...snapshot, completedSets: [] }).success).toBe(false);
    expect(() => trainingInvitationsService.sharedSession('invalid')).toThrow();
  });
});
