import { z } from 'zod';
import { tutorialProgressStatuses } from '@gymsheet/types';

/** Runtime validator for a persisted tutorial progress record. */
export const tutorialProgressRecordSchema = z.object({
  tutorialId: z.string().min(1),
  status: z.enum(tutorialProgressStatuses),
  version: z.string().min(1),
  currentStepId: z.string().nullable().default(null),
  startedAt: z.string().nullable().default(null),
  completedAt: z.string().nullable().default(null),
  lastInteractionAt: z.string().min(1),
  repeatCount: z.number().int().nonnegative().default(0),
});

/** Collection returned by `GET /me/tutorial-progress`. */
export const tutorialProgressListSchema = z.array(tutorialProgressRecordSchema);

/** Idempotent upsert body for `PUT /me/tutorial-progress/:tutorialId`. */
export const tutorialProgressUpsertSchema = z.object({
  status: z.enum(tutorialProgressStatuses),
  version: z.string().min(1),
  currentStepId: z.string().nullable().optional(),
  startedAt: z.string().nullable().optional(),
  completedAt: z.string().nullable().optional(),
  repeatCount: z.number().int().nonnegative().optional(),
});
