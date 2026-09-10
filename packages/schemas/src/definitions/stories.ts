import { z } from 'zod';

/** Foto o video efímero (24h), visible a todo el tenant. Independiente de la galería de fotos permanente. */

export const storyMediaTypes = ['image', 'video'] as const;
export type StoryMediaType = (typeof storyMediaTypes)[number];

export const storySchema = z.object({
  id: z.string().uuid(),
  mediaUrl: z.string(),
  mediaType: z.enum(storyMediaTypes),
  createdAt: z.string(),
  expiresAt: z.string(),
});
export type Story = z.infer<typeof storySchema>;

export const storyFeedEntrySchema = z.object({
  userId: z.string().uuid(),
  fullName: z.string(),
  photoUrl: z.string().nullable(),
  /** `true` si al menos una de sus stories activas todavía no la vi — pinta el anillo de color. */
  hasUnviewed: z.boolean(),
  stories: z.array(
    z.object({
      id: z.string().uuid(),
      mediaUrl: z.string(),
      mediaType: z.enum(storyMediaTypes),
      createdAt: z.string(),
      viewedByMe: z.boolean(),
    }),
  ),
});
export type StoryFeedEntry = z.infer<typeof storyFeedEntrySchema>;

export const profileViewsSummarySchema = z.object({
  uniqueViewersToday: z.number().int().min(0),
});
export type ProfileViewsSummary = z.infer<typeof profileViewsSummarySchema>;
