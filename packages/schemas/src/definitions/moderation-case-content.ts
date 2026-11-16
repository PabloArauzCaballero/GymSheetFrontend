import { z } from 'zod';

/**
 * Read-only copy of the reported target inside the moderation case file
 * (`GET /admin/moderation/cases/:kind/:id`, backend ADR-0018 §9). The moderator
 * reads it here: the author's routes (`GET /routines/:id`, exercises) stay
 * closed to it. Hidden content is included; an erased target is `null` with
 * `contentUnavailableReason: 'ERASED'`.
 */
const routineDayContentSchema = z.object({
  name: z.string().nullable(),
  /** 1 = Monday … 7 = Sunday. */
  weekday: z.number().int().nullable(),
  exercises: z.array(
    z.object({
      name: z.string(),
      sets: z.number().int(),
      repsMin: z.number().int().nullable(),
      repsMax: z.number().int().nullable(),
      weightKg: z.number().nullable(),
      durationSeconds: z.number().int().nullable(),
    }),
  ),
});

export const moderationCaseContentSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('ROUTINE'),
    name: z.string(),
    description: z.string().nullable(),
    visibility: z.string(),
    days: z.array(routineDayContentSchema),
    /** How far it already spread: counts only. */
    reach: z.object({
      copies: z.number().int(),
      liveCopies: z.number().int(),
      activations: z.number().int(),
    }),
  }),
  z.object({
    kind: z.literal('EXERCISE'),
    name: z.string(),
    description: z.string().nullable(),
    muscleGroups: z.array(z.string()),
    instructions: z.array(z.string()),
    media: z.array(z.object({ type: z.string(), url: z.string() })),
  }),
  z.object({
    kind: z.literal('COMMENT'),
    text: z.string(),
    attachmentUrl: z.string().nullable(),
    attachmentType: z.string().nullable(),
    deletedByAuthor: z.boolean(),
  }),
  z.object({
    kind: z.enum(['REEL', 'STORY', 'PROFILE_PHOTO']),
    mediaUrl: z.string(),
    mediaType: z.string().nullable(),
    caption: z.string().nullable(),
  }),
  z.object({ kind: z.literal('USER'), displayName: z.string(), mainPhotoUrl: z.string().nullable() }),
  z.object({
    kind: z.literal('MUSIC_PLAYLIST'),
    name: z.string(),
    url: z.string(),
    type: z.string(),
    imageUrl: z.string().nullable(),
  }),
]);
export type ModerationCaseContent = z.infer<typeof moderationCaseContentSchema>;
export type ModerationRoutineContent = Extract<ModerationCaseContent, { kind: 'ROUTINE' }>;
export type ModerationExerciseContent = Extract<ModerationCaseContent, { kind: 'EXERCISE' }>;

export const moderationContentUnavailableReasons = ['ERASED', 'CHAT_EVIDENCE'] as const;

/** Fields the case file adds for the content; absent on an older backend, so they default to `null`. */
export const moderationCaseContentFields = {
  content: moderationCaseContentSchema.nullish().transform((value) => value ?? null),
  contentUnavailableReason: z
    .enum(moderationContentUnavailableReasons)
    .nullish()
    .transform((value) => value ?? null),
};
