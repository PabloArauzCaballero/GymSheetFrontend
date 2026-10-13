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
  })
  .strict();

export type ReelDTO = z.infer<typeof reelSchema>;

/** The agreed first feed response is a single page with no continuation cursor. */
export const reelsFeedSchema = z
  .object({
    items: z.array(reelSchema),
    nextCursor: z.null(),
  })
  .strict();

export type ReelsFeed = z.infer<typeof reelsFeedSchema>;
