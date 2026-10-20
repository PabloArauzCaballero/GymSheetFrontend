import { z } from 'zod';
import { ratingHistogramSchema } from './directory';

export const createReviewInputSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().min(3).max(120),
  body: z.string().trim().min(10).max(2000),
  experienceDate: z.string().optional(),
});
export type CreateReviewInput = z.infer<typeof createReviewInputSchema>;

export const updateReviewInputSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  title: z.string().trim().min(3).max(120).optional(),
  body: z.string().trim().min(10).max(2000).optional(),
  experienceDate: z.string().optional(),
});
export type UpdateReviewInput = z.infer<typeof updateReviewInputSchema>;

export const reviewReplySchema = z.object({
  id: z.string(),
  authorName: z.string(),
  authorRole: z.string(),
  replyText: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ReviewReply = z.infer<typeof reviewReplySchema>;

export const createReviewReplyInputSchema = z.object({
  replyText: z.string().trim().min(5).max(1500),
});
export type CreateReviewReplyInput = z.infer<typeof createReviewReplyInputSchema>;

export const reviewItemSchema = z.object({
  id: z.string(),
  entityId: z.string(),
  author: z.object({
    id: z.string(),
    displayName: z.string(),
    avatarUrl: z.string().nullable(),
  }),
  rating: z.number().int().min(1).max(5),
  title: z.string(),
  body: z.string(),
  isVerifiedAthlete: z.boolean(),
  helpfulCount: z.number().int().nonnegative(),
  hasVotedHelpful: z.boolean().default(false),
  reply: reviewReplySchema.nullable(),
  createdAt: z.string(),
  editedAt: z.string().nullable(),
});
export type ReviewItem = z.infer<typeof reviewItemSchema>;

export const entityReviewsResponseSchema = z.object({
  entityId: z.string(),
  score: z.number(),
  totalReviews: z.number(),
  histogram: ratingHistogramSchema,
  userReview: reviewItemSchema.nullable(),
  reviews: z.array(reviewItemSchema),
  nextCursor: z.string().nullable(),
});
export type EntityReviewsResponse = z.infer<typeof entityReviewsResponseSchema>;

export const listReviewsQuerySchema = z.object({
  sortBy: z.enum(['helpful', 'recent', 'highest', 'lowest']).optional().default('helpful'),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  cursor: z.string().optional(),
});
export type ListReviewsQuery = z.input<typeof listReviewsQuerySchema>;
