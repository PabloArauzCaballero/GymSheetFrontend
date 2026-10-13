import { apiRequest, apiUpload } from '@/shared/api/api-client';
import { reelSchema, reelsFeedSchema, type ReelDTO, type ReelsFeed } from '@gymsheet/schemas';

/** Client for the server-validated reel feed and multipart publication flow. */
export const reelsService = {
  feed: () => apiRequest<ReelsFeed>('/me/reels/feed', reelsFeedSchema),
  upload: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return apiUpload<ReelDTO>('/me/reels', reelSchema, form);
  },
};
