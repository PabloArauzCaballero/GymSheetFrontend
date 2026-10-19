import { z } from 'zod';
import { apiRequest } from '@/shared/api/api-client';
import type {
  CategoryTreeNode,
  CreateReviewInput,
  CreateReviewReplyInput,
  DirectoryEntitySummary,
  DirectoryFilterQuery,
  EntityReviewsResponse,
  ListReviewsQuery,
  ReviewItem,
  UpdateReviewInput,
} from '@/shared/api/schemas';
import {
  categoryTreeNodeSchema,
  directoryEntitySummarySchema,
  entityReviewsResponseSchema,
  reviewItemSchema,
} from '@/shared/api/schemas';

export const directoryClient = {
  getCategories: (scope?: string) => {
    const q = scope ? `?scope=${encodeURIComponent(scope)}` : '';
    return apiRequest<CategoryTreeNode[]>(
      `/public/directory/categories${q}`,
      z.array(categoryTreeNodeSchema)
    );
  },

  listEntities: (filters: DirectoryFilterQuery) => {
    const params = new URLSearchParams();
    if (filters.categoryPath) params.set('category_path', filters.categoryPath);
    if (filters.type) params.set('type', filters.type);
    if (filters.search) params.set('search', filters.search);
    if (filters.ratingMin) params.set('rating_min', String(filters.ratingMin));
    if (filters.verifiedOnly) params.set('verified_only', 'true');
    if (filters.city) params.set('city', filters.city);
    if (filters.limit) params.set('limit', String(filters.limit));

    return apiRequest<DirectoryEntitySummary[]>(
      `/public/directory/entities?${params.toString()}`,
      z.array(directoryEntitySummarySchema)
    );
  },

  listReviews: (entityId: string, query: Partial<ListReviewsQuery> = {}) => {
    const params = new URLSearchParams();
    if (query.sortBy) params.set('sort_by', query.sortBy);
    if (query.rating) params.set('rating', String(query.rating));
    if (query.limit) params.set('limit', String(query.limit));

    return apiRequest<EntityReviewsResponse>(
      `/public/directory/entities/${entityId}/reviews?${params.toString()}`,
      entityReviewsResponseSchema
    );
  },

  createReview: (entityId: string, input: CreateReviewInput) => {
    return apiRequest<ReviewItem>(
      `/directory/entities/${entityId}/reviews`,
      reviewItemSchema,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: input.rating,
          title: input.title,
          body: input.body,
          experience_date: input.experienceDate,
        }),
      }
    );
  },

  updateReview: (reviewId: string, input: UpdateReviewInput) => {
    return apiRequest<ReviewItem>(
      `/directory/reviews/${reviewId}`,
      reviewItemSchema,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: input.rating,
          title: input.title,
          body: input.body,
          experience_date: input.experienceDate,
        }),
      }
    );
  },

  deleteReview: (reviewId: string) => {
    return apiRequest<void>(
      `/directory/reviews/${reviewId}`,
      z.void(),
      { method: 'DELETE' }
    );
  },

  toggleHelpful: (reviewId: string) => {
    return apiRequest<{ hasVoted: boolean; newCount: number }>(
      `/directory/reviews/${reviewId}/helpful`,
      z.object({ hasVoted: z.boolean(), newCount: z.number() }),
      { method: 'POST' }
    );
  },

  replyToReview: (reviewId: string, input: CreateReviewReplyInput) => {
    return apiRequest<ReviewItem>(
      `/directory/reviews/${reviewId}/reply`,
      reviewItemSchema,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reply_text: input.replyText }),
      }
    );
  },
};
