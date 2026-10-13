import { z } from 'zod';
import { apiRequest, downloadFromApi } from '@/shared/api/api-client';

const createTrainingInviteInputSchema = z
  .object({
    recipientId: z.string().uuid(),
    startsAt: z.string().datetime({ offset: true }),
    timeZone: z.string().min(1).max(80),
    durationMinutes: z.number().int().min(15).max(360),
    place: z
      .object({
        kind: z.literal('PUBLIC_PLACE'),
        label: z.string().trim().min(2).max(180),
      })
      .strict(),
    mode: z.enum(['OWN_ROUTINES', 'SHARED_SESSION']),
    routineSessionId: z.string().uuid().optional(),
    note: z.string().trim().max(1000).optional(),
    clientRequestId: z.string().uuid(),
  })
  .strict()
  .superRefine((input, context) => {
    if (input.mode === 'SHARED_SESSION' && !input.routineSessionId) {
      context.addIssue({
        code: 'custom',
        message: 'Selecciona una rutina para compartir.',
        path: ['routineSessionId'],
      });
    }
    if (input.mode === 'OWN_ROUTINES' && input.routineSessionId) {
      context.addIssue({
        code: 'custom',
        message: 'La rutina solo se envía para una sesión compartida.',
        path: ['routineSessionId'],
      });
    }
  });

export type CreateTrainingInviteInput = z.infer<typeof createTrainingInviteInputSchema>;

export const trainingInvitationSchema = z
  .object({
    id: z.string().uuid(),
    state: z.enum(['PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'CANCELLED']),
    currentRevision: z.number().int().positive(),
    revisions: z
      .array(
        z
          .object({
            revision: z.number().int().positive(),
            proposerId: z.string().uuid(),
            startsAt: z.string().datetime({ offset: true }),
            timeZone: z.string(),
            durationMinutes: z.number().int().min(15).max(360),
            place: z
              .object({
                kind: z.enum(['GYM', 'PUBLIC_PLACE']),
                placeId: z.string().uuid().optional(),
                label: z.string(),
              })
              .strict(),
            mode: z.enum(['OWN_ROUTINES', 'SHARED_SESSION']),
            routineSessionId: z.string().uuid().optional(),
            note: z.string().optional(),
            createdAt: z.string().datetime({ offset: true }),
          })
          .strict(),
      )
      .min(1),
    participants: z.array(z.string().uuid()).length(2),
    createdAt: z.string().datetime({ offset: true }),
    updatedAt: z.string().datetime({ offset: true }),
  })
  .strict();

export type TrainingInvitation = z.infer<typeof trainingInvitationSchema>;

const meetingSchema = z
  .object({
    id: z.string().uuid(),
    acceptedRevision: z.number().int().positive(),
    startsAt: z.string().datetime({ offset: true }),
    timeZone: z.string(),
    placeLabel: z.string(),
    cancelledAt: z.string().datetime({ offset: true }).nullable(),
  })
  .strict();

const responseSchema = z
  .object({
    decision: z.enum(['ACCEPT', 'DECLINE']),
    respondedBy: z.string().uuid(),
    revision: z.number().int().positive(),
    respondedAt: z.string().datetime({ offset: true }),
  })
  .strict()
  .nullable();

const respondResultSchema = trainingInvitationSchema.extend({ response: responseSchema });

export const listedTrainingInvitationSchema = respondResultSchema.extend({
  meeting: meetingSchema.nullable(),
});

export type ListedTrainingInvitation = z.infer<typeof listedTrainingInvitationSchema>;

export const sharedSessionSchema = z
  .object({
    inviteId: z.string().uuid(),
    routineId: z.string().uuid(),
    revision: z.number().int().positive(),
    name: z.string(),
    exercises: z.array(
      z
        .object({
          exerciseId: z.string().uuid(),
          exerciseName: z.string(),
          order: z.number().int(),
          targetSets: z.number().int().positive(),
          repsMin: z.number().int().nullable(),
          repsMax: z.number().int().nullable(),
          restSeconds: z.number().int().nullable(),
        })
        .strict(),
    ),
  })
  .strict();

export type SharedSession = z.infer<typeof sharedSessionSchema>;

const respondInputSchema = z
  .object({
    expectedRevision: z.number().int().positive(),
    decision: z.enum(['ACCEPT', 'DECLINE']),
    clientRequestId: z.string().uuid(),
  })
  .strict();

export type RespondTrainingInvitationInput = z.infer<typeof respondInputSchema>;

export const trainingInvitationsService = {
  list() {
    return apiRequest('/me/training-invitations', z.array(listedTrainingInvitationSchema));
  },
  create(input: CreateTrainingInviteInput) {
    const parsed = createTrainingInviteInputSchema.parse(input);
    return apiRequest<TrainingInvitation>('/me/training-invitations', trainingInvitationSchema, {
      method: 'POST',
      body: parsed,
    });
  },
  respond(id: string, input: RespondTrainingInvitationInput) {
    const parsedId = z.string().uuid().parse(id);
    const parsedInput = respondInputSchema.parse(input);
    return apiRequest(`/me/training-invitations/${parsedId}/respond`, respondResultSchema, {
      method: 'POST',
      body: parsedInput,
    });
  },
  exportCalendar(id: string) {
    const parsedId = z.string().uuid().parse(id);
    return downloadFromApi(
      `/me/training-invitations/${parsedId}/calendar.ics`,
      `gymsheet-entrenamiento-${parsedId}.ics`,
    );
  },
  sharedSession(id: string) {
    const parsedId = z.string().uuid().parse(id);
    return apiRequest(`/me/training-invitations/${parsedId}/shared-session`, sharedSessionSchema);
  },
};
