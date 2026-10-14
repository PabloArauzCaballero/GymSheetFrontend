import { z } from 'zod';
import {
  commentDeletedSchema,
  commentLikeSchema,
  commentPageSchema,
  contentRatingSchema,
  routineCommentSchema,
} from '@gymsheet/schemas';
import type { ContentKind, CreateCommentInput, ReportTargetKind } from '@gymsheet/types';
import type { RequestFn } from './routine-services';

const reportResultSchema = z.object({
  id: z.string(),
  status: z.string(),
  contentHidden: z.boolean(),
});

/** Valoraciones, comentarios y denuncias de rutinas y ejercicios privados (RF-12). */
export function createCommunityServices(request: RequestFn) {
  return {
    rating: (kind: ContentKind, id: string) =>
      request(`/ratings/${kind}/${id}`, contentRatingSchema, { method: 'GET' }),
    rate: (kind: ContentKind, id: string, estrellas: number) =>
      request(`/ratings/${kind}/${id}`, contentRatingSchema, {
        method: 'PUT',
        body: { estrellas },
      }),
    removeRating: (kind: ContentKind, id: string) =>
      request(`/ratings/${kind}/${id}`, contentRatingSchema, { method: 'DELETE' }),
    comments: (kind: ContentKind, id: string, cursor?: string) =>
      request(
        `/comments/${kind}/${id}${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`,
        commentPageSchema,
        { method: 'GET' },
      ),
    comment: (kind: ContentKind, id: string, input: CreateCommentInput) =>
      request(`/comments/${kind}/${id}`, routineCommentSchema, { method: 'POST', body: input }),
    likeComment: (commentId: string) =>
      request(`/comments/${commentId}/like`, commentLikeSchema, { method: 'PUT' }),
    unlikeComment: (commentId: string) =>
      request(`/comments/${commentId}/like`, commentLikeSchema, { method: 'DELETE' }),
    removeComment: (commentId: string) =>
      request(`/comments/${commentId}`, commentDeletedSchema, { method: 'DELETE' }),
    report: (input: {
      targetKind: ReportTargetKind;
      targetId: string;
      reason: string;
      details?: string;
    }) => request('/me/reports', reportResultSchema, { method: 'POST', body: input }),
  };
}

export type CommunityServices = ReturnType<typeof createCommunityServices>;
