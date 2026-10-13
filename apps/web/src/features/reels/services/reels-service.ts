import { apiRequest, apiUpload } from '@/shared/api/api-client';
import { z } from 'zod';
import { reelSchema, reelsFeedSchema, type ReelDTO, type ReelsFeed } from '@gymsheet/schemas';

export type ReelFeedTab = 'MINE' | 'FOR_YOU' | 'CONNECTIONS';

const commentSchema = z.object({
  id: z.string().uuid(),
  reelId: z.string().uuid(),
  parentCommentId: z.string().uuid().nullable(),
  userId: z.string().uuid(),
  displayName: z.string(),
  body: z.string().nullable(),
  deleted: z.boolean(),
  createdAt: z.string().datetime(),
});
const commentsSchema = z.array(commentSchema);
const actionResultSchema = z.object({
  saved: z.boolean().optional(),
  reposted: z.boolean().optional(),
  liked: z.boolean().optional(),
});

/** Client for the server-validated reel feed and multipart publication flow. */
export const reelsService = {
  feed: (tab: ReelFeedTab = 'MINE', cursor?: string) => {
    const params = new URLSearchParams({ tab });
    if (cursor) params.set('cursor', cursor);
    return apiRequest<ReelsFeed>(`/me/reels/feed?${params.toString()}`, reelsFeedSchema);
  },
  saved: () => apiRequest<ReelsFeed>('/me/reels/saved', reelsFeedSchema),
  save: (reelId: string, saved: boolean) =>
    apiRequest(`/me/reels/${reelId}/save`, actionResultSchema, { method: 'POST', body: { saved } }),
  repost: (reelId: string, reposted: boolean) =>
    apiRequest(`/me/reels/${reelId}/repost`, actionResultSchema, {
      method: 'POST',
      body: { reposted },
    }),
  like: (reelId: string, liked: boolean) =>
    apiRequest(`/me/reels/${reelId}/like`, actionResultSchema, { method: 'POST', body: { liked } }),
  comments: (reelId: string) => apiRequest(`/me/reels/${reelId}/comments`, commentsSchema),
  createComment: (reelId: string, body: string, parentCommentId?: string) =>
    apiRequest(`/me/reels/${reelId}/comments`, commentSchema, {
      method: 'POST',
      body: { body, ...(parentCommentId ? { parentCommentId } : {}) },
    }),
  closeComments: (reelId: string, enabled: boolean) =>
    apiRequest(`/me/reels/${reelId}/comments`, z.object({ commentsEnabled: z.boolean() }), {
      method: 'PATCH',
      body: { enabled },
    }),
  delete: (reelId: string) =>
    apiRequest(`/me/reels/${reelId}`, z.object({ deleted: z.boolean() }), { method: 'DELETE' }),
  upload: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return apiUpload<ReelDTO>('/me/reels', reelSchema, form);
  },
};
