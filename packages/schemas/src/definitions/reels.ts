import { z } from "zod";

/** A reel available for playback after server-side processing has completed. */
export const reelSchema = z
  .object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    mediaUrl: z.string().min(1),
    durationSeconds: z.number().finite().positive().max(90),
    status: z.literal("READY"),
    createdAt: z.string().datetime(),
    commentsEnabled: z.boolean().optional(),
    commentsCount: z.number().int().nonnegative().optional(),
    likesCount: z.number().int().nonnegative().optional(),
    likedByMe: z.boolean().optional(),
    savedByMe: z.boolean().optional(),
    repostedByMe: z.boolean().optional(),
    sharedBy: z
      .array(z.object({ userId: z.string().uuid(), displayName: z.string() }))
      .optional(),
  })
  .strict();

export type ReelDTO = z.infer<typeof reelSchema>;

/** A feed page and its optional signed continuation cursor. */
export const reelsFeedSchema = z
  .object({
    items: z.array(reelSchema),
    nextCursor: z.string().min(1).nullable(),
  })
  .strict();

export type ReelsFeed = z.infer<typeof reelsFeedSchema>;
